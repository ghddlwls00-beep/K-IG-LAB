/**
 * SWF text extraction.
 *
 * The conversation lessons (Man / Woman / Student) drew their sentences inside
 * the Flash movie, so the HTML page is an empty shell and the words only exist
 * as `DefineText` records. Recovering them is a two-step job, because Flash
 * does not store characters in those records — it stores *glyph indices* into
 * an embedded font:
 *
 *   1. Parse DefineFont2/3 (tags 48 / 75) to read each font's CodeTable, which
 *      maps glyph index -> character code.
 *   2. Parse DefineText/DefineText2 (tags 11 / 33), whose bit-packed glyph
 *      entries are then translated through that map.
 *
 * Reference: SWF File Format Specification v19 — "Fonts and Text".
 */

import { inflate, tagsOf } from "./swf-audio.mjs";

const TAG_DEFINE_TEXT = 11;
const TAG_DEFINE_TEXT2 = 33;
const TAG_DEFINE_EDIT_TEXT = 37;
const TAG_DEFINE_FONT2 = 48;
const TAG_DEFINE_FONT3 = 75;

/** Reads big-endian bit fields, which is how SWF packs its variable-width values. */
class BitReader {
  constructor(buf, pos = 0) {
    this.buf = buf;
    this.pos = pos;
    this.bit = 0;
  }
  align() {
    if (this.bit !== 0) {
      this.bit = 0;
      this.pos += 1;
    }
  }
  ub(n) {
    let value = 0;
    for (let i = 0; i < n; i++) {
      if (this.pos >= this.buf.length) return value;
      const bit = (this.buf[this.pos] >> (7 - this.bit)) & 1;
      value = value * 2 + bit;
      this.bit += 1;
      if (this.bit === 8) {
        this.bit = 0;
        this.pos += 1;
      }
    }
    return value;
  }
  sb(n) {
    const value = this.ub(n);
    // Sign-extend from n bits.
    return value >= 2 ** (n - 1) ? value - 2 ** n : value;
  }
  skipRect() {
    const n = this.ub(5);
    this.ub(n * 4);
    this.align();
  }
  /** Reads a MATRIX, returning its translation so text can be ordered by position. */
  readMatrix() {
    if (this.ub(1)) {
      const n = this.ub(5);
      this.ub(n * 2); // scale
    }
    if (this.ub(1)) {
      const n = this.ub(5);
      this.ub(n * 2); // rotate/skew
    }
    const nt = this.ub(5);
    const x = this.sb(nt);
    const y = this.sb(nt);
    this.align();
    return { x, y };
  }
}

/** glyph index -> character, per font id. */
function fontTables(tags) {
  const fonts = new Map();
  for (const tag of tags) {
    if (tag.type !== TAG_DEFINE_FONT2 && tag.type !== TAG_DEFINE_FONT3) continue;
    const b = tag.body;
    try {
      let pos = 0;
      const fontId = b.readUInt16LE(pos);
      pos += 2;
      const flags = b[pos];
      pos += 1;
      const wideOffsets = Boolean(flags & 0x08);
      const wideCodes = Boolean(flags & 0x04);
      pos += 1; // language code
      const nameLen = b[pos];
      pos += 1 + nameLen;
      const numGlyphs = b.readUInt16LE(pos);
      pos += 2;
      if (numGlyphs === 0) continue;

      // Offsets are relative to the start of the offset table itself.
      const tableStart = pos;
      pos += numGlyphs * (wideOffsets ? 4 : 2);
      const codeTableOffset = wideOffsets ? b.readUInt32LE(pos) : b.readUInt16LE(pos);

      let cp = tableStart + codeTableOffset;
      const map = new Map();
      for (let i = 0; i < numGlyphs; i++) {
        if (cp + (wideCodes ? 2 : 1) > b.length) break;
        const code = wideCodes ? b.readUInt16LE(cp) : b[cp];
        cp += wideCodes ? 2 : 1;
        map.set(i, code);
      }
      fonts.set(fontId, map);
    } catch {
      // A malformed font table just means those glyphs stay unresolved.
    }
  }
  return fonts;
}

function readTextTag(body, isText2, fonts) {
  const r = new BitReader(body, 0);
  r.pos = 2; // character id
  r.skipRect();
  const origin = r.readMatrix();
  const glyphBits = body[r.pos];
  const advanceBits = body[r.pos + 1];
  r.pos += 2;
  r.bit = 0;

  let out = "";
  let currentFont = null;

  for (;;) {
    if (r.pos >= body.length) break;
    const flags = body[r.pos];
    r.pos += 1;
    if (flags === 0) break;

    const isStyle = (flags & 0x80) !== 0;
    if (isStyle) {
      const hasFont = (flags & 0x08) !== 0;
      const hasColor = (flags & 0x04) !== 0;
      const hasYOffset = (flags & 0x02) !== 0;
      const hasXOffset = (flags & 0x01) !== 0;
      if (hasFont) {
        currentFont = body.readUInt16LE(r.pos);
        r.pos += 2;
      }
      if (hasColor) r.pos += isText2 ? 4 : 3;
      if (hasXOffset) r.pos += 2;
      if (hasYOffset) r.pos += 2;
      if (hasFont) r.pos += 2; // text height
      continue;
    }

    // Glyph record: the low 7 bits are the glyph count.
    const count = flags & 0x7f;
    r.bit = 0;
    const map = currentFont !== null ? fonts.get(currentFont) : null;
    for (let i = 0; i < count; i++) {
      const index = r.ub(glyphBits);
      r.sb(advanceBits);
      const code = map?.get(index);
      if (code !== undefined && code !== 0) out += String.fromCharCode(code);
    }
    r.align();
  }
  return { text: out, x: origin.x, y: origin.y };
}

/** DefineEditText carries a plain string, when the movie used input fields. */
function readEditText(body) {
  try {
    const r = new BitReader(body, 2);
    r.skipRect();
    const flags = body.readUInt16LE(r.pos);
    r.pos += 2;
    const hasText = (flags & 0x0080) !== 0;
    const hasFont = (flags & 0x0001) !== 0;
    const hasFontClass = (flags & 0x8000) !== 0;
    const hasTextColor = (flags & 0x0004) !== 0;
    const hasMaxLength = (flags & 0x0002) !== 0;
    const hasLayout = (flags & 0x2000) !== 0;
    if (hasFont) r.pos += 4;
    if (hasFontClass) while (body[r.pos++] !== 0);
    if (hasTextColor) r.pos += 4;
    if (hasMaxLength) r.pos += 2;
    if (hasLayout) r.pos += 9;
    while (body[r.pos++] !== 0); // variable name
    if (!hasText) return "";
    let end = r.pos;
    while (end < body.length && body[end] !== 0) end++;
    return body.subarray(r.pos, end).toString("utf8");
  } catch {
    return "";
  }
}

/**
 * All readable text in a movie, in document order, de-duplicated and cleaned.
 * Flash splits a sentence across several records, so short fragments are
 * common and are stitched by the caller rather than here.
 */
export function extractSwfText(buffer) {
  const raw = inflate(buffer);
  const tags = tagsOf(raw);
  const fonts = fontTables(tags);

  const pieces = [];
  let order = 0;
  for (const tag of tags) {
    let text = "";
    let x = 0;
    let y = 0;
    if (tag.type === TAG_DEFINE_TEXT || tag.type === TAG_DEFINE_TEXT2) {
      try {
        const parsed = readTextTag(tag.body, tag.type === TAG_DEFINE_TEXT2, fonts);
        text = parsed.text;
        x = parsed.x;
        y = parsed.y;
      } catch {
        continue;
      }
    } else if (tag.type === TAG_DEFINE_EDIT_TEXT) {
      text = readEditText(tag.body);
    } else {
      continue;
    }
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (cleaned) pieces.push({ text: cleaned, x, y, order: order++ });
  }

  // Tags are stored in definition order, which is the order the author happened
  // to create the fields in — "Principle 3" before "Principle 1". Sorting by
  // where the text sits on the stage recovers reading order instead. Rows are
  // bucketed (twips are fine-grained) so that a line's pieces stay together.
  const ROW = 200; // twips; ~10pt of vertical tolerance
  pieces.sort((a, b) => {
    const row = Math.floor(a.y / ROW) - Math.floor(b.y / ROW);
    if (row !== 0) return row;
    if (a.x !== b.x) return a.x - b.x;
    return a.order - b.order;
  });

  const seen = new Set();
  const unique = pieces
    .map((p) => p.text)
    .filter((p) => {
      if (seen.has(p)) return false;
      seen.add(p);
      return true;
    });

  // Some movies also hold a combined field that simply concatenates two lines
  // that already exist on their own ("<korean><chinese>"). Keeping it would
  // print the same sentence a third time, so drop any piece that is exactly two
  // other pieces joined.
  const set = new Set(unique);
  return unique.filter((piece) => {
    for (const other of set) {
      if (other === piece || !piece.startsWith(other)) continue;
      if (set.has(piece.slice(other.length).trim())) return false;
    }
    return true;
  });
}

/**
 * Turns recovered fragments into lesson blocks.
 *
 * Navigation chrome ("PLAY", "NEXT", page numbers) is dropped; numbered lines
 * become drill sentences, as in the HTML courses; everything else stays a
 * paragraph so nothing meaningful is silently discarded.
 */
const CHROME =
  /^(play|stop|pause|next|prev|previous|back|menu|home|replay|start|exit|close|한\/영|영\/한|재생|정지|\d{1,2}\.?)$/i;
const NUMBERED = /^\s*(\d{1,2})\s*[.)]\s*(.+)$/s;
// The Chinese course organises each lesson by numbered "Principles";
// the English one by "Chapters". Both are section markers, not content.
const CHAPTER = /^(chapter|unit|lesson|principle)\s*[\d-]+\s*:?$/i;
const HANGUL = /[ㄱ-ㆎ가-힣]/;
const HAN = /[\u4E00-\u9FFF]/;

export function textBlocks(pieces) {
  const blocks = [];
  let sentences = null;

  for (const piece of pieces) {
    if (piece.length < 2 || CHROME.test(piece)) continue;

    const numbered = piece.match(NUMBERED);
    if (numbered) {
      const item = { n: numbered[1], text: numbered[2].trim() };
      if (sentences) sentences.items.push(item);
      else {
        sentences = { type: "sentences", items: [item] };
        blocks.push(sentences);
      }
      continue;
    }
    if (CHAPTER.test(piece)) {
      sentences = null;
      blocks.push({ type: "heading", text: piece });
      continue;
    }
    sentences = null;
    // Lessons alternate a Korean line and its English counterpart; tagging the
    // script lets the page present them as a pair rather than a flat list.
    blocks.push({
      type: "paragraph",
      text: piece,
      // Korean wins when both scripts are present, because the Chinese lines
      // carry a Korean gloss in parentheses rather than the other way round.
      lang: HANGUL.test(piece) ? "ko" : HAN.test(piece) ? "zh" : "en",
    });
  }
  return blocks;
}
