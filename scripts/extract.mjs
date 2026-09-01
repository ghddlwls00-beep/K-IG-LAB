#!/usr/bin/env node
/**
 * Legacy archive -> JSON content pipeline.
 *
 * Walks the original "본사 Lab v1.01" folder, parses every lesson page, and
 * writes one JSON file per lesson into content/lessons/<course>/. Audio is
 * copied into public/audio/<course>/ unless --no-media is passed.
 *
 * Nothing here talks to a database: the output is plain files that Next.js
 * reads at build time.
 *
 * Usage:
 *   node scripts/extract.mjs --src "H:/랩자료모음/최종 Lab/최신Lab/본사 Lab v1.01"
 *   node scripts/extract.mjs --src <path> --course ld --no-media
 *   node scripts/extract.mjs --src <path> --dry-run
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import * as cheerio from "cheerio";
import { extractSwfAudio, orderAudio } from "./swf-audio.mjs";
import { parseLegacyMenu } from "./legacy-menu.mjs";
import { readHwpText, transcriptBlocks, hasFfmpeg, transcodeVideo } from "./cnn.mjs";
import { extractChinese } from "./chinese.mjs";
import { extractSwfText, textBlocks } from "./swf-text.mjs";

// ---------------------------------------------------------------------------
// Course registry. Mirrors src/lib/courses.ts — kept as plain data here so the
// script runs with no build step.
// ---------------------------------------------------------------------------

const COURSES = [
  { slug: "ld", folder: "LD", numbering: "sequence", kind: "audio-drill", series: [["d", "d"]] },
  { slug: "reading", folder: "reading", numbering: "sequence", kind: "audio-drill", series: [["pr", "pr"]] },
  { slug: "basics", folder: "basics", numbering: "unit-lesson", kind: "audio-drill", series: [["po", "po"], ["qa", "qa"]] },
  { slug: "middle", folder: "middle", numbering: "unit-lesson", kind: "audio-drill", series: [["p", "p"]] },
  { slug: "adults", folder: "adults", numbering: "unit-lesson", kind: "audio-drill", series: [["am", "am"], ["aw", "aw"]] },
  { slug: "phonics", folder: "phonics", numbering: "sequence", kind: "audio-drill", series: [["hv", "hv-"], ["mv1", "mv1-"], ["mv2", "mv2-"], ["mv3", "mv3-"]] },
  { slug: "grammar1", folder: "grammar1", numbering: "sequence", kind: "audio-drill", series: [["gh1", "gh1-"]] },
  { slug: "grammar2", folder: "grammar2", numbering: "sequence", kind: "audio-drill", series: [["gh2", "gh2-"]] },
  { slug: "man", folder: "Man", numbering: "unit-part", kind: "flash-video", series: [["m", "m"]] },
  { slug: "woman", folder: "Woman", numbering: "unit-part", kind: "flash-video", series: [["w", "w"]] },
  { slug: "student", folder: "Student", numbering: "unit-part", kind: "flash-video", series: [["s", "s"]] },
];

const TAB_OF = {
  phonics: "voca", basics: "students", middle: "men", adults: "women",
  grammar1: "grammar1", grammar2: "grammar2", ld: "ld", reading: "reading",
  man: "men", woman: "women", student: "students", cnn: "cnn",
};

// ---------------------------------------------------------------------------
// Progress reporting
//
// Several stages are slow and were previously silent for minutes at a time —
// decoding 263 Flash movies, transcoding 120 videos — which makes a working
// run look hung. Every long loop now reports as it goes.
// ---------------------------------------------------------------------------

const IS_TTY = Boolean(process.stdout.isTTY);
let statusWidth = 0;
let lastPrinted = 0;

/** Transient one-line status. Overwrites itself on a terminal. */
function status(text) {
  const line = `  ${text}`;
  if (IS_TTY) {
    process.stdout.write("\r" + line.padEnd(statusWidth));
    statusWidth = Math.max(statusWidth, line.length);
  } else {
    // Redirected to a file or pipe: no carriage returns, just periodic lines.
    const now = Date.now();
    if (now - lastPrinted > 4000) {
      lastPrinted = now;
      console.log(line);
    }
  }
}

/** Clear the transient line before printing something permanent. */
function clearStatus() {
  if (IS_TTY && statusWidth > 0) {
    process.stdout.write("\r" + " ".repeat(statusWidth) + "\r");
    statusWidth = 0;
  }
}

function done(text) {
  clearStatus();
  console.log(text);
}

/** Pages that are site chrome, not lessons. */
const CHROME = new Set(["index", "menu", "cover", "under", "passoff", "_temp"]);

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { src: null, chinese: null, course: null, media: true, dryRun: false, limit: 0 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--src") args.src = argv[++i];
    else if (a === "--chinese") args.chinese = argv[++i];
    else if (a === "--course") args.course = argv[++i];
    else if (a === "--no-media") args.media = false;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--limit") args.limit = Number(argv[++i]);
  }
  return args;
}

// ---------------------------------------------------------------------------
// Decoding. The archive mixes UTF-8 and EUC-KR, sometimes within one folder.
// Decoding with the wrong one silently produces mojibake rather than throwing,
// so we validate rather than trust the meta tag.
// ---------------------------------------------------------------------------

function decodeFile(buf) {
  // A strict UTF-8 decode throws on invalid sequences, which is the reliable
  // signal. EUC-KR bytes almost always fail it.
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
    return { text, encoding: "utf-8" };
  } catch {
    return { text: new TextDecoder("euc-kr").decode(buf), encoding: "euc-kr" };
  }
}

// ---------------------------------------------------------------------------
// Filename -> identity
// ---------------------------------------------------------------------------

/**
 * Splits a legacy basename into series, number and trailing variant.
 * The trailing `-N` means different things per course, so `numbering` decides.
 */
function identify(basename, course) {
  // Longest prefix first, so "mv1-" wins over "m".
  const series = [...course.series].sort((a, b) => b[1].length - a[1].length);
  for (const [slug, prefix] of series) {
    if (!basename.startsWith(prefix)) continue;
    const rest = basename.slice(prefix.length);
    const m = rest.match(/^(\d+[a-z]?)(?:-(\d+))?$/i);
    if (!m) continue;

    const digits = m[1];
    const suffix = m[2] ?? null;

    let unit = null;
    let part = null;
    let variant = "main";
    let pairBase = null;

    if (course.numbering === "unit-part") {
      // m1-1 => unit 1, part 1. A bare m1 is the unit cover.
      unit = parseInt(digits, 10);
      part = suffix ? parseInt(suffix, 10) : null;
    } else {
      if (course.numbering === "unit-lesson") {
        const d = digits.replace(/[a-z]$/i, "");
        if (d.length >= 3) {
          unit = parseInt(d.slice(0, 2), 10);
          part = parseInt(d.slice(2), 10);
        } else {
          unit = parseInt(d, 10); // two digits => unit cover page
          part = null;
        }
      } else {
        unit = parseInt(digits.replace(/[a-z]$/i, ""), 10);
      }
      // For every non-flash course a trailing -N is the Korean script twin.
      if (suffix) {
        variant = "script";
        pairBase = prefix + digits;
      }
    }

    return { series: slug, digits, unit, part, variant, pairBase };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Page -> blocks
// ---------------------------------------------------------------------------

const LABEL_RE = /^\s*[[〔【]\s*(.+?)\s*[\]〕】]\s*$/;
const SENTENCE_RE = /^\s*(\d+)\s*[.)]\s*(.*)$/s;
const HANGUL_RE = /[\u3131-\u318E\uAC00-\uD7A3]/;

function clean(s) {
  return s
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAudio($, courseSlug) {
  const out = [];
  const seen = new Set();
  const push = (raw, autoplay) => {
    if (!raw) return;
    const file = path.basename(raw.split("?")[0]);
    if (!/\.(mp3|wav)$/i.test(file)) return;
    // Deduplicate on the file alone. The legacy layout embedded the SAME mp3
    // twice per page — once autostarting at the top to listen, once silent at
    // the bottom to replay while writing — which is an artifact of having no
    // seek or replay control, not two pieces of audio. One player with a scrub
    // bar replaces both, so keying this on file+autoplay (as it used to) just
    // rendered the same track twice.
    if (seen.has(file)) return;
    seen.add(file);
    out.push({
      src: `/audio/${courseSlug}/${file}`,
      legacySrc: raw,
      autoplay,
    });
  };
  $("embed").each((_, el) => {
    const src = $(el).attr("src");
    const auto = ($(el).attr("autostart") ?? "").toLowerCase() === "true";
    push(src, auto);
  });
  $("param[name='FileName'], param[name='src'], param[name='URL']").each((_, el) => {
    push($(el).attr("value"), false);
  });
  return out;
}

function extractFlash($) {
  const out = [];
  $("embed[src$='.swf'], param[name='movie']").each((_, el) => {
    const raw = $(el).attr("src") ?? $(el).attr("value");
    if (raw && !out.includes(raw)) out.push(raw);
  });
  return out;
}

/**
 * The lesson body lives in the content cells (the legacy layout wraps them in
 * a table with cellpadding="10"). We walk those cells in document order and
 * classify each paragraph, which is what turns hand-written markup into data.
 */
function extractBlocks($) {
  const blocks = [];
  let sawSentence = false;

  // Content cells only. The selector also matches cells of tables nested inside
  // a content cell (phonics word grids), so drop any cell that lives inside
  // another matched cell — otherwise a grid's words are emitted twice.
  const all = $("table[cellpadding='10'] td").toArray();
  const cells = all.filter((td) => !$(td).parents("td").toArray().some((p) => all.includes(p)));
  const scope = cells.length ? cells : $("body").toArray();

  for (const cell of scope) {
    const $cell = $(cell);

    // Phonics word grids: a bordered table of single words.
    const grids = $cell.find("table").toArray();
    for (const g of grids) {
      const rows = [];
      $(g)
        .find("tr")
        .each((_, tr) => {
          const cellsText = $(tr)
            .find("td")
            .map((__, td) => clean($(td).text()))
            .get()
            .filter(Boolean);
          if (cellsText.length) rows.push(cellsText);
        });
      if (rows.length && rows.some((r) => r.length > 1)) {
        blocks.push({ type: "wordgrid", rows });
        $(g).remove();
      }
    }

    $cell.find("p, P").each((_, p) => {
      const text = clean($(p).text());
      if (!text) return;

      const label = text.match(LABEL_RE);
      if (label && blocks.length === 0) {
        blocks.push({ type: "heading", text });
        return;
      }

      const sentence = text.match(SENTENCE_RE);
      if (sentence) {
        sawSentence = true;
        const last = blocks[blocks.length - 1];
        const item = { n: sentence[1], text: clean(sentence[2]) };
        if (last && last.type === "sentences") last.items.push(item);
        else blocks.push({ type: "sentences", items: [item] });
        return;
      }

      // A short parenthetical after a sentence is a continuation of it.
      const last = blocks[blocks.length - 1];
      if (last && last.type === "sentences" && /^[(（]/.test(text)) {
        const items = last.items;
        items[items.length - 1].text += " " + text;
        return;
      }

      if (!sawSentence) {
        // Before any drill sentence: instructions, then vocabulary hints.
        // Hints are the single Latin-only line of proper nouns that directly
        // follows the instruction in a dictation lesson. Anything else that
        // happens to be Latin-only (word lists, stray labels) is not a hint.
        const previous = blocks[blocks.length - 1];
        const isHint =
          !HANGUL_RE.test(text) &&
          previous?.type === "instruction" &&
          !blocks.some((b) => b.type === "hints");
        blocks.push(isHint ? { type: "hints", text } : { type: "instruction", text });
        return;
      }

      blocks.push({ type: "paragraph", text });
    });
  }

  // Interactive affordances from the legacy mailto form.
  const choices = $("input[type='radio']")
    .map((_, el) => clean($(el).attr("value") ?? ""))
    .get()
    .filter(Boolean);
  if (choices.length) {
    blocks.push({ type: "choice", options: [...new Set(choices)] });
  }
  const $textarea = $("textarea").first();
  if ($textarea.length) {
    blocks.push({ type: "dictation", rows: Number($textarea.attr("rows")) || 10 });
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// CNN
// ---------------------------------------------------------------------------

/**
 * The CNN section is shaped unlike every other course: no lesson HTML at all,
 * just numbered `.wmv` clips paired with `.hwp` transcripts, split across two
 * subfolders. So it gets its own pass rather than being forced through the
 * HTML walker.
 */
function extractCnn(SRC, args, stats, CONTENT, PUBLIC_DIR) {
  const dir = path.join(SRC, "CNN");
  if (!fs.existsSync(dir)) {
    stats.warnings.push("missing folder: CNN");
    return;
  }

  const ffmpeg = hasFfmpeg();
  if (!ffmpeg && args.media && !args.dryRun) {
    stats.warnings.push(
      "ffmpeg not found on PATH — CNN transcripts will be extracted but the video will not be transcoded",
    );
  }

  const subs = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort((a, b) => (parseInt(a.replace(/\D/g, ""), 10) || 0) - (parseInt(b.replace(/\D/g, ""), 10) || 0));

  const lessons = [];
  const groups = [];

  for (const sub of subs) {
    const subdir = path.join(dir, sub);
    const clips = fs
      .readdirSync(subdir)
      .filter((f) => /^\d+\.wmv$/i.test(f))
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    if (clips.length === 0) continue;

    const groupLessons = [];

    let clipIndex = 0;
    for (const clip of clips) {
      clipIndex++;
      const num = parseInt(clip, 10);
      const id = `cnn${String(num).padStart(3, "0")}`;
      const stem = path.basename(clip, path.extname(clip));

      // Transcript
      let blocks = [];
      let title = `CNN ${num}`;
      const hwp = path.join(subdir, `${stem}.hwp`);
      if (fs.existsSync(hwp)) {
        try {
          blocks = transcriptBlocks(readHwpText(hwp));
          const heading = blocks.find((b) => b.type === "heading");
          if (heading) title = heading.text;
        } catch (err) {
          stats.warnings.push(`hwp parse failed: CNN/${sub}/${stem}.hwp — ${err.message}`);
        }
      } else {
        stats.warnings.push(`missing transcript: CNN/${sub}/${stem}.hwp`);
      }

      // Video
      const video = [];
      const srcClip = path.join(subdir, clip);
      const destRel = `/video/cnn/${id}.mp4`;
      const dest = path.join(PUBLIC_DIR, "video", "cnn", `${id}.mp4`);
      if (ffmpeg && args.media && !args.dryRun) {
        try {
          status(`cnn: transcoding ${sub}/${clip}  (${clipIndex}/${clips.length})`);
          const outcome = transcodeVideo(srcClip, dest);
          if (outcome) stats.video++;
          if (typeof outcome === "string") {
            // The clip only converted after its container was repaired, which
            // is worth knowing even though it succeeded.
            stats.repairedVideo++;
          }
          video.push({ src: destRel, legacySrc: `CNN/${sub}/${clip}` });
        } catch (err) {
          stats.warnings.push(`transcode failed: CNN/${sub}/${clip} — ${String(err.message).slice(0, 120)}`);
        }
      } else {
        video.push({ src: destRel, legacySrc: `CNN/${sub}/${clip}` });
      }

      lessons.push({
        id,
        course: "cnn",
        series: "cnn",
        variant: "main",
        pairId: null,
        title,
        label: title,
        menuLabel: `[ CNN ${num} ]`,
        unit: num,
        part: null,
        order: lessons.length,
        audio: [],
        video,
        blocks,
        legacyPath: `CNN/${sub}/${clip}`,
        legacyEncoding: "binary",
      });
      groupLessons.push(id);
      stats.pages++;
    }

    groups.push({ label: sub, lessons: groupLessons });
  }

  if (lessons.length === 0 || args.dryRun) {
    done(`${"cnn".padEnd(9)} ${String(lessons.length).padStart(4)} clips`);
    return;
  }

  const outDir = path.join(CONTENT, "lessons", "cnn");
  fs.mkdirSync(outDir, { recursive: true });
  for (const lesson of lessons) {
    fs.writeFileSync(path.join(outDir, `${lesson.id}.json`), JSON.stringify(lesson, null, 2), "utf-8");
  }
  fs.mkdirSync(path.join(CONTENT, "courses"), { recursive: true });
  fs.writeFileSync(
    path.join(CONTENT, "courses", "cnn.json"),
    JSON.stringify(
      {
        course: "cnn",
        tab: "cnn",
        lessonCount: lessons.length,
        groups,
        lessons: lessons.map((l) => ({
          id: l.id,
          title: l.title,
          label: l.label,
          series: l.series,
          variant: l.variant,
          unit: l.unit,
          part: l.part,
          order: l.order,
          hasAudio: false,
          hasVideo: l.video.length > 0,
          menuLabel: l.menuLabel,
        })),
      },
      null,
      2,
    ),
    "utf-8",
  );
  stats.groups += groups.length;
  done(`${"cnn".padEnd(9)} ${String(lessons.length).padStart(4)} clips     (${groups.length} groups)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv);
  if (!args.src) {
    console.error("error: --src <path to 본사 Lab v1.01> is required");
    process.exit(1);
  }
  const SRC = args.src;
  if (!fs.existsSync(SRC)) {
    console.error(`error: source folder not found: ${SRC}`);
    process.exit(1);
  }

  const ROOT = path.resolve(import.meta.dirname, "..");
  const CONTENT = path.join(ROOT, "content");
  const PUBLIC_AUDIO = path.join(ROOT, "public", "audio");

  const stats = { pages: 0, skipped: 0, audio: 0, video: 0, repairedVideo: 0, swfParsed: 0, silentSwf: 0, damagedSwf: 0, swfText: 0, groups: 0, byCourse: {}, warnings: [] };
  const courses = args.course ? COURSES.filter((c) => c.slug === args.course) : COURSES;
  console.log(`source: ${SRC}`);
  const planned = args.course
    ? [args.course]
    : [...courses.map((c) => c.slug), "cnn", "chinese"];
  console.log(`courses: ${planned.join(", ")}`);
  if (!args.media) console.log("media: skipped (--no-media)");
  console.log("");

  for (const course of courses) {
    const dir = path.join(SRC, course.folder);
    if (!fs.existsSync(dir)) {
      stats.warnings.push(`missing folder: ${course.folder}`);
      continue;
    }

    const outDir = path.join(CONTENT, "lessons", course.slug);
    if (!args.dryRun) fs.mkdirSync(outDir, { recursive: true });

    // Recover the legacy dropdown navigation for this course, if it had one.
    let menu = { groups: [], labels: {}, crossLinks: [] };
    const menuPath = path.join(dir, "menu.htm");
    if (fs.existsSync(menuPath)) {
      try {
        menu = parseLegacyMenu(decodeFile(fs.readFileSync(menuPath)).text);
      } catch (err) {
        stats.warnings.push(`menu parse failed: ${course.folder}/menu.htm — ${err.message}`);
      }
    }
    stats.groups += menu.groups.length;

    const files = fs
      .readdirSync(dir)
      .filter((f) => /\.html?$/i.test(f))
      .sort();

    const lessons = [];

    let scanned = 0;
    for (const file of files) {
      if (++scanned % 10 === 0 || scanned === files.length) {
        status(`${course.slug}: parsing ${scanned}/${files.length} pages`);
      }
      const basename = path.basename(file, path.extname(file));
      if (CHROME.has(basename.toLowerCase())) continue;
      if (/home$/i.test(basename)) continue;

      let ident = identify(basename, course);
      if (!ident) {
        // Pages like basics_001.htm / adults_001.htm are real lessons with
        // their own audio — the folder name plus a number, rather than the
        // series prefix. They were being discarded as splash screens.
        // The course prefix can itself end in a digit — "grammar1_001" — so
        // matching only letters before the underscore silently dropped a real
        // lesson.
        const intro = basename.match(/^([a-z][a-z0-9]*)_(\d+)$/i);
        if (intro) {
          ident = {
            series: null,
            digits: intro[2],
            unit: parseInt(intro[2], 10),
            part: null,
            variant: "main",
            pairBase: null,
          };
        } else {
          stats.skipped++;
          stats.warnings.push(`unrecognized filename: ${course.folder}/${file}`);
          continue;
        }
      }

      const buf = fs.readFileSync(path.join(dir, file));
      const { text, encoding } = decodeFile(buf);
      const $ = cheerio.load(text);

      const flash = extractFlash($);
      let audio = extractAudio($, course.slug);

      // Flash lessons carry their audio inside the .swf rather than in a
      // sounds/ folder, so it has to be parsed out of the movie itself.
      const swfBlocks = [];
      if (course.kind === "flash-video" && flash.length) {
        const dest = path.join(PUBLIC_AUDIO, course.slug);
        for (const ref of flash) {
          const swfPath = path.join(dir, path.basename(ref));
          if (!fs.existsSync(swfPath)) {
            stats.warnings.push(`missing swf: ${course.folder}/${path.basename(ref)}`);
            continue;
          }
          status(`${course.slug}: decoding ${path.basename(ref)} (${scanned}/${files.length})`);
          const swfBuffer = fs.readFileSync(swfPath);
          const swfName = `${course.folder}/${path.basename(ref)}`;

          // The lesson's words are drawn inside the movie as glyph indices, so
          // the HTML shell looks empty until they are decoded out of it.
          let textError = null;
          try {
            const recovered = textBlocks(extractSwfText(swfBuffer));
            if (recovered.length) {
              swfBlocks.push(...recovered);
              stats.swfText += recovered.length;
            }
          } catch (err) {
            textError = err.message;
          }

          let sounds;
          try {
            sounds = orderAudio(extractSwfAudio(swfBuffer));
          } catch (err) {
            // Text and audio both come from the same decompressed stream, so a
            // damaged movie fails both for one reason. Report it once.
            stats.warnings.push(
              `damaged swf, skipped: ${swfName} — ${err.message}` +
                (textError && textError !== err.message ? ` (text: ${textError})` : ""),
            );
            stats.damagedSwf++;
            continue;
          }
          if (textError) {
            stats.warnings.push(`swf text unreadable: ${swfName} — ${textError}`);
          }
          if (sounds.length === 0) {
            // Cover and menu movies legitimately hold no narration.
            stats.silentSwf++;
            continue;
          }
          const stem = path.basename(ref, path.extname(ref));
          sounds.forEach((sound, i) => {
            const name = sounds.length === 1 ? `${stem}.${sound.ext}` : `${stem}-${i + 1}.${sound.ext}`;
            if (args.media && !args.dryRun) {
              fs.mkdirSync(dest, { recursive: true });
              fs.writeFileSync(path.join(dest, name), sound.data);
              stats.audio++;
            }
            audio.push({
              src: `/audio/${course.slug}/${name}`,
              legacySrc: `${ref}#${sound.kind}`,
              autoplay: false,
            });
          });
          stats.swfParsed++;
        }
      }

      const blocks = course.kind === "flash-video" ? swfBlocks : extractBlocks($);
      const heading = blocks.find((b) => b.type === "heading");

      const lesson = {
        id: basename,
        course: course.slug,
        series: ident.series,
        variant: ident.variant,
        pairId: ident.pairBase,
        title: clean($("title").text()) || basename,
        label: heading ? heading.text : null,
        menuLabel: menu.labels[basename] ?? null,
        unit: Number.isNaN(ident.unit) ? null : ident.unit,
        part: ident.part,
        order: 0,
        audio,
        video: [],
        blocks,
        legacyPath: `${course.folder}/${file}`,
        legacyEncoding: encoding,
        ...(flash.length ? { legacyFlash: flash } : {}),
      };

      lessons.push(lesson);
      stats.pages++;
      if (args.limit && stats.pages >= args.limit) break;
    }

    // Prefer the legacy menu's own order; fall back to unit/part for the
    // courses whose menu had no dropdowns.
    const menuOrder = new Map();
    menu.groups.forEach((g) => g.lessons.forEach((id) => {
      if (!menuOrder.has(id)) menuOrder.set(id, menuOrder.size);
    }));
    lessons.sort((a, b) => {
      const ai = menuOrder.get(a.id);
      const bi = menuOrder.get(b.id);
      if (ai !== undefined && bi !== undefined) return ai - bi;
      if (ai !== undefined) return -1;
      if (bi !== undefined) return 1;
      return (
        (a.unit ?? 0) - (b.unit ?? 0) ||
        (a.part ?? 0) - (b.part ?? 0) ||
        a.id.localeCompare(b.id)
      );
    });
    lessons.forEach((l, i) => (l.order = i));

    // Keep only groups whose lessons actually exist on disk.
    const present = new Set(lessons.map((l) => l.id));
    const groups = menu.groups
      .map((g) => ({ label: g.label, lessons: g.lessons.filter((id) => present.has(id)) }))
      .filter((g) => g.lessons.length > 0);
    const grouped = new Set(groups.flatMap((g) => g.lessons));
    const ungrouped = lessons.filter((l) => !grouped.has(l.id)).map((l) => l.id);
    if (groups.length > 0 && ungrouped.length > 0) {
      groups.push({ label: "기타 · Other", lessons: ungrouped });
    }

    if (!args.dryRun) {
      for (const lesson of lessons) {
        fs.writeFileSync(
          path.join(outDir, `${lesson.id}.json`),
          JSON.stringify(lesson, null, 2),
          "utf-8",
        );
      }

      // Per-course index so pages never read every lesson file.
      const index = {
        course: course.slug,
        tab: TAB_OF[course.slug] ?? null,
        lessonCount: lessons.length,
        groups,
        lessons: lessons.map((l) => ({
          id: l.id,
          title: l.title,
          label: l.label,
          series: l.series,
          variant: l.variant,
          unit: l.unit,
          part: l.part,
          order: l.order,
          hasAudio: l.audio.length > 0,
          menuLabel: l.menuLabel,
        })),
      };
      fs.mkdirSync(path.join(CONTENT, "courses"), { recursive: true });
      fs.writeFileSync(
        path.join(CONTENT, "courses", `${course.slug}.json`),
        JSON.stringify(index, null, 2),
        "utf-8",
      );
    }

    // Media: copy the referenced audio next to the app.
    if (args.media && !args.dryRun) {
      const soundsDir = path.join(dir, "sounds");
      if (fs.existsSync(soundsDir)) {
        const dest = path.join(PUBLIC_AUDIO, course.slug);
        fs.mkdirSync(dest, { recursive: true });
        let copied = 0;
        for (const lesson of lessons) {
          if (++copied % 25 === 0) status(`${course.slug}: copying audio ${copied}/${lessons.length}`);
          for (const a of lesson.audio) {
            const file = path.basename(a.src);
            const from = path.join(soundsDir, file);
            const to = path.join(dest, file);
            if (fs.existsSync(from) && !fs.existsSync(to)) {
              fs.copyFileSync(from, to);
              stats.audio++;
            } else if (!fs.existsSync(from)) {
              stats.warnings.push(`missing audio: ${course.folder}/sounds/${file}`);
            }
          }
        }
      }
    }

    stats.byCourse[course.slug] = lessons.length;
    done(
      `${course.slug.padEnd(9)} ${String(lessons.length).padStart(4)} lessons` +
        `  (${lessons.filter((l) => l.variant === "script").length} script pages)`,
    );
  }

  if (!args.course || args.course === "cnn") {
    extractCnn(SRC, args, stats, CONTENT, path.join(ROOT, "public"));
  }

  // The Chinese course lives in its own folder alongside the main archive
  // rather than inside it, so it is located separately.
  if (!args.course || args.course === "chinese") {
    const guess = path.resolve(SRC, "..", "..", "중국");
    const chineseSrc = args.chinese ?? (fs.existsSync(guess) ? guess : null);
    if (chineseSrc) {
      extractChinese(chineseSrc, args, stats, CONTENT, path.join(ROOT, "public"), {
        status,
        done,
      });
    } else if (args.course === "chinese") {
      stats.warnings.push(
        "Chinese folder not found. Pass --chinese \"<path to 중국>\" to locate it.",
      );
    }
  }

  clearStatus();
  console.log("\n" + "-".repeat(52));
  console.log(`pages parsed : ${stats.pages}`);
  console.log(`audio files  : ${stats.audio}`);
  console.log(`swf parsed   : ${stats.swfParsed} (${stats.silentSwf} held no audio)`);
  console.log(`menu groups  : ${stats.groups}`);
  console.log(`video clips  : ${stats.video}${stats.repairedVideo ? ` (${stats.repairedVideo} needed repair)` : ""}`);
  console.log(`swf text     : ${stats.swfText} blocks recovered`);
  if (stats.damagedSwf) console.log(`damaged swf  : ${stats.damagedSwf}`);
  console.log(`skipped      : ${stats.skipped}`);
  if (stats.warnings.length) {
    console.log(`warnings     : ${stats.warnings.length}`);
    for (const w of stats.warnings.slice(0, 15)) console.log(`  - ${w}`);
    if (stats.warnings.length > 15) {
      console.log(`  ... and ${stats.warnings.length - 15} more`);
    }
  }
  if (args.dryRun) console.log("\n(dry run — nothing written)");
}

main();
