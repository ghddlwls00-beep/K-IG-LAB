/**
 * CNN course restoration.
 *
 * The CNN section shipped 120 news clips as Windows Media (`.wmv`) with a
 * companion Hangul Word Processor document (`.hwp`) per clip holding the
 * transcript. Neither format runs in a browser, but both are recoverable:
 *
 *   .wmv  — WMV2 video + WMAV2 audio in an ASF container. ffmpeg transcodes
 *           these to H.264/AAC MP4. Note the ASF header's duration is often
 *           wrong (it counts padding); the decoded length is the real one, so
 *           a shorter output is expected and is not lost content.
 *
 *   .hwp  — HWP 5.0, an OLE2 compound file whose BodyText sections are raw
 *           DEFLATE. Not encrypted, so the text comes out cleanly. Each
 *           document holds the English transcript, a Korean translation, and a
 *           vocabulary glossary.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";
import CFB from "cfb";

// ---------------------------------------------------------------------------
// HWP 5.0 text extraction
// ---------------------------------------------------------------------------

const HWPTAG_PARA_TEXT = 16 + 51; // 67

/**
 * Control characters inside paragraph text. Extended and inline controls
 * occupy eight UTF-16 units (the marker, twelve bytes of payload, the marker
 * again); everything else is a single unit. Getting this wrong shifts the
 * whole stream and produces garbage, so the set is explicit.
 */
const WIDE_CONTROLS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);

function paragraphsFromSection(raw) {
  const paragraphs = [];
  let pos = 0;
  while (pos + 4 <= raw.length) {
    const header = raw.readUInt32LE(pos);
    pos += 4;
    const tag = header & 0x3ff;
    let size = (header >> 20) & 0xfff;
    if (size === 0xfff) {
      size = raw.readUInt32LE(pos);
      pos += 4;
    }
    const body = raw.subarray(pos, pos + size);
    pos += size;
    if (tag !== HWPTAG_PARA_TEXT) continue;

    let out = "";
    const units = Math.floor(body.length / 2);
    for (let i = 0; i < units; ) {
      const ch = body.readUInt16LE(i * 2);
      if (ch === 10 || ch === 13) {
        out += "\n";
        i += 1;
      } else if (ch < 32) {
        i += WIDE_CONTROLS.has(ch) ? 8 : 1;
      } else {
        out += String.fromCharCode(ch);
        i += 1;
      }
    }
    paragraphs.push(out);
  }
  return paragraphs.join("\n");
}

/**
 * Pinyin tone marks that HWP stored in a private-use area.
 *
 * The Chinese course's pronunciation guides were typed in a font that carried
 * ā/á/ǎ/à as custom glyphs, because the Korean fonts of the day had no such
 * characters. Left alone they decode to unassigned codepoints and render as
 * empty boxes, which makes the pinyin useless — so they are mapped back to real
 * Unicode. Every other vowel in these documents was already encoded properly.
 */
const HWP_PRIVATE_PINYIN = {
  "\u{F0400}": "\u0101", // ā  first tone
  "\u{F0401}": "\u00E1", // á  second tone
  "\u{F0402}": "\u01CE", // ǎ  third tone
  "\u{F0403}": "\u00E0", // à  fourth tone
};

export function normalizeHwpText(text) {
  return text.replace(/[\u{F0400}-\u{F0403}]/gu, (ch) => HWP_PRIVATE_PINYIN[ch] ?? ch);
}

export function readHwpText(file) {
  const cf = CFB.read(fs.readFileSync(file), { type: "buffer" });
  const find = (name) => cf.FileIndex.find((e) => e.name === name);

  const header = find("FileHeader");
  if (!header) throw new Error("not an HWP 5 document (no FileHeader)");
  const flags = Buffer.from(header.content).readUInt32LE(36);
  if (flags & 2) throw new Error("document is encrypted");
  const compressed = Boolean(flags & 1);

  const sections = cf.FileIndex.filter((e) => /^Section\d+$/.test(e.name ?? ""));
  const chunks = sections.map((entry) => {
    let data = Buffer.from(entry.content);
    if (compressed) data = zlib.inflateRawSync(data);
    return paragraphsFromSection(data);
  });
  return normalizeHwpText(chunks.join("\n"));
}

// ---------------------------------------------------------------------------
// Transcript -> typed blocks
// ---------------------------------------------------------------------------

const HANGUL = /[ㄱ-ㆎ가-힣]/;
/** Glossary lines read "word/ definition". */
const GLOSS = /^\s*([^/\n]{1,60}?)\s*\/\s*(.+)$/;

/**
 * Turns a transcript document into the same block shapes the drill lessons
 * use, so one renderer covers both. The documents follow a consistent order —
 * headline, English transcript, Korean translation, then a glossary — and are
 * classified by script and shape rather than by position, which survives the
 * documents that omit a part.
 */
export function transcriptBlocks(text) {
  const paragraphs = text
    .split("\n")
    .map((p) => p.replace(/ /g, " ").trim())
    .filter(Boolean);

  const blocks = [];
  const glossary = [];

  for (const [i, para] of paragraphs.entries()) {
    const gloss = para.match(GLOSS);
    // A glossary entry is short, has the "term / meaning" shape, and never
    // starts a document — that last check keeps headlines with slashes out.
    if (gloss && i > 0 && para.length < 400 && !/[.!?]\s/.test(gloss[1])) {
      glossary.push({ n: gloss[1], text: gloss[2] });
      continue;
    }
    if (i === 0) {
      blocks.push({ type: "heading", text: para });
      continue;
    }
    blocks.push({ type: "paragraph", text: para, lang: HANGUL.test(para) ? "ko" : "en" });
  }

  if (glossary.length) {
    blocks.push({ type: "sentences", items: glossary });
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Video
// ---------------------------------------------------------------------------

export function hasFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Transcode one clip to MP4. Returns false if the output already exists, so a
 * re-run is cheap — transcoding 120 clips is the slowest part of extraction.
 */
function runFfmpeg(args) {
  try {
    execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"], maxBuffer: 8 << 20 });
    return null;
  } catch (err) {
    // execFileSync's own message is just the command line, which says nothing
    // about why it failed. ffmpeg's reason is on stderr.
    const reason = (err.stderr?.toString() ?? "").trim().split("\n").slice(-2).join(" ");
    return reason || err.message;
  }
}

/** The 16-byte GUID that begins every ASF (and therefore every .wmv) file. */
const ASF_GUID = Buffer.from("3026b2758e66cf11a6d900aa0062ce6c", "hex");

/**
 * Some clips in the archive have junk bytes prepended before the real ASF
 * header, which makes ffmpeg reject the file outright ("Invalid data found").
 * The container itself is intact — it just starts late. Returns a path to a
 * repaired temporary copy, or null when the file needs no repair.
 */
function repairAsfPrefix(src) {
  const buf = fs.readFileSync(src);
  if (buf.subarray(0, 16).equals(ASF_GUID)) return null;
  const offset = buf.indexOf(ASF_GUID);
  if (offset <= 0) return null;
  const fixed = path.join(os.tmpdir(), `passoff-repair-${path.basename(src)}`);
  fs.writeFileSync(fixed, buf.subarray(offset));
  return fixed;
}

export function transcodeVideo(src, dest) {
  if (fs.existsSync(dest)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  const encode = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-c:a", "aac", "-b:a", "128k",
    // Lets the browser start playing before the whole file arrives.
    "-movflags", "+faststart"];

  let reason = runFfmpeg(["-v", "error", "-y", "-i", src, ...encode, dest]);
  if (!reason) return true;

  // A misplaced container header is the common failure, and it is repairable.
  const repaired = repairAsfPrefix(src);
  if (repaired) {
    const afterRepair = runFfmpeg(["-v", "error", "-y", "-i", repaired, ...encode, dest]);
    try {
      fs.unlinkSync(repaired);
    } catch {
      /* temp file cleanup is best-effort */
    }
    if (!afterRepair) return "repaired";
    reason = afterRepair;
  }

  // A handful of clips in the archive have corrupt packets. Retrying with error
  // concealment recovers the playable remainder instead of losing the clip.
  const tolerant = runFfmpeg([
    "-v", "error", "-y",
    "-err_detect", "ignore_err",
    "-fflags", "+discardcorrupt+genpts",
    "-i", src,
    ...encode,
    dest,
  ]);
  if (!tolerant) return "recovered";

  // Leave no partial file behind for a clip that genuinely failed.
  try {
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
  } catch {
    /* nothing further to do */
  }
  throw new Error(reason);
}
