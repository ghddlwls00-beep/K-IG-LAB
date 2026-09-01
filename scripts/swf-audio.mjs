/**
 * SWF audio extraction.
 *
 * The conversation courses (Man / Woman / Student) shipped their audio inside
 * Flash movies. Flash stores sound in standard, documented formats — MP3 frames
 * or raw PCM — so recovering it is a parsing job, not a decompilation job, and
 * the result is bit-identical to what the original lesson played. Nothing is
 * re-encoded here.
 *
 * Two places hold sound in a SWF:
 *   DefineSound (tag 14)       — a complete, self-contained sound.
 *   SoundStreamBlock (tag 19)  — timeline-synced narration, split into one
 *                                chunk per frame, described by a preceding
 *                                SoundStreamHead (tag 18 / 45).
 *
 * Reference: SWF File Format Specification v19, sections on sound tags.
 */

import zlib from "node:zlib";

const TAG_END = 0;
const TAG_DEFINE_SOUND = 14;
const TAG_SOUND_STREAM_HEAD = 18;
const TAG_SOUND_STREAM_BLOCK = 19;
const TAG_DEFINE_SPRITE = 39;
const TAG_SOUND_STREAM_HEAD2 = 45;

/** SoundFormat codes from the SWF spec. */
const FORMAT = {
  0: "pcm-native",
  1: "adpcm",
  2: "mp3",
  3: "pcm-le",
  4: "nellymoser16",
  5: "nellymoser8",
  6: "nellymoser",
  11: "speex",
};

const RATE = { 0: 5512, 1: 11025, 2: 22050, 3: 44100 };

/**
 * Decompress the SWF body. The 8-byte header is always uncompressed.
 *
 * A few movies in the archive have damaged or truncated compressed tails. A
 * strict inflate throws on those and loses the whole file, even though the
 * earlier tags — which hold the lesson's text and audio — decompressed fine. So
 * a failed strict pass falls back to a tolerant one that returns everything it
 * managed to read.
 */
export function inflate(buf) {
  const sig = buf.toString("latin1", 0, 3);
  if (sig === "FWS") return buf;
  if (sig === "ZWS") throw new Error("LZMA-compressed SWF (ZWS) is not supported");
  if (sig !== "CWS") throw new Error(`not a SWF (signature ${JSON.stringify(sig)})`);

  const body = buf.subarray(8);
  try {
    return Buffer.concat([buf.subarray(0, 8), zlib.inflateSync(body)]);
  } catch (strictError) {
    const partial = inflateUpToDamage(body);
    if (!partial || partial.length === 0) throw strictError;
    return Buffer.concat([buf.subarray(0, 8), partial]);
  }
}

/**
 * Recovers everything that decompresses before the first damaged byte.
 *
 * `Z_SYNC_FLUSH` tolerates a *truncated* stream but still throws on corruption,
 * so the trick is to find the longest prefix that is merely truncated. Failure
 * is monotonic — every prefix containing the bad byte fails and every shorter
 * one succeeds — so a binary search finds the boundary in ~20 attempts instead
 * of scanning. One archive movie yields 2.3MB of its 2.55MB this way, which is
 * every lesson tag; the loss is at the tail.
 */
function inflateUpToDamage(body) {
  let low = 0;
  let high = body.length;
  let best = null;
  while (low <= high) {
    const mid = (low + high) >> 1;
    try {
      best = zlib.inflateSync(body.subarray(0, mid), {
        finishFlush: zlib.constants.Z_SYNC_FLUSH,
      });
      low = mid + 1;
    } catch {
      high = mid - 1;
    }
  }
  return best;
}

/**
 * Walk the tag stream. Sprites carry their own nested tag stream, and lesson
 * audio is frequently inside one, so we recurse into them.
 */
function readTags(raw, start, end, out, depth = 0) {
  let pos = start;
  while (pos < end - 1) {
    const codeAndLength = raw.readUInt16LE(pos);
    pos += 2;
    const type = codeAndLength >> 6;
    let length = codeAndLength & 0x3f;
    if (length === 0x3f) {
      length = raw.readUInt32LE(pos);
      pos += 4;
    }
    const bodyStart = pos;
    const bodyEnd = bodyStart + length;
    if (bodyEnd > end) break;

    out.push({ type, body: raw.subarray(bodyStart, bodyEnd) });
    pos = bodyEnd;

    if (type === TAG_END) break;
    // DefineSprite: UI16 spriteId + UI16 frameCount, then nested tags.
    if (type === TAG_DEFINE_SPRITE && depth < 6) {
      readTags(raw, bodyStart + 4, bodyEnd, out, depth + 1);
    }
  }
  return out;
}

/** Skip the SWF header: signature, version, length, frame RECT, rate, count. */
export function tagsOf(raw) {
  let pos = 8;
  const nbits = raw[pos] >> 3;
  pos += Math.ceil((5 + nbits * 4) / 8);
  pos += 4;
  return readTags(raw, pos, raw.length, []);
}

/** Minimal RIFF/WAVE header for raw PCM. */
function wavHeader({ dataLength, sampleRate, channels, bitsPerSample }) {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const h = Buffer.alloc(44);
  h.write("RIFF", 0, "latin1");
  h.writeUInt32LE(36 + dataLength, 4);
  h.write("WAVE", 8, "latin1");
  h.write("fmt ", 12, "latin1");
  h.writeUInt32LE(16, 16); // PCM chunk size
  h.writeUInt16LE(1, 20); // format = PCM
  h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(byteRate, 28);
  h.writeUInt16LE(blockAlign, 32);
  h.writeUInt16LE(bitsPerSample, 34);
  h.write("data", 36, "latin1");
  h.writeUInt32LE(dataLength, 40);
  return h;
}

/**
 * Extract every sound in a SWF.
 *
 * Returns objects of the shape:
 *   { kind: "stream" | "event", ext: "mp3" | "wav", data: Buffer, meta }
 * where `meta` records the source format so a caller can report on it.
 */
export function extractSwfAudio(buffer) {
  const raw = inflate(buffer);
  const tags = tagsOf(raw);
  const results = [];

  // --- Event sounds -------------------------------------------------------
  for (const tag of tags) {
    if (tag.type !== TAG_DEFINE_SOUND) continue;
    const b = tag.body;
    if (b.length < 7) continue;

    const soundId = b.readUInt16LE(0);
    const flags = b[2];
    const format = (flags >> 4) & 0x0f;
    const rate = RATE[(flags >> 2) & 0x03];
    const bits = (flags >> 1) & 0x01 ? 16 : 8;
    const channels = flags & 0x01 ? 2 : 1;
    const sampleCount = b.readUInt32LE(3);
    let data = b.subarray(7);

    const meta = { soundId, format: FORMAT[format] ?? String(format), rate, bits, channels, sampleCount };

    if (format === 2) {
      // MP3: SI16 SeekSamples, then raw MP3 frames.
      results.push({ kind: "event", ext: "mp3", data: data.subarray(2), meta });
    } else if (format === 0 || format === 3) {
      const header = wavHeader({
        dataLength: data.length,
        sampleRate: rate,
        channels,
        bitsPerSample: bits,
      });
      results.push({ kind: "event", ext: "wav", data: Buffer.concat([header, data]), meta });
    } else {
      // ADPCM / Nellymoser / Speex need a decoder we deliberately don't ship.
      results.push({ kind: "event", ext: null, data: null, meta, unsupported: true });
    }
  }

  // --- Streaming (timeline) sound ----------------------------------------
  // A SWF can hold several streams; each SoundStreamHead starts a new one and
  // the SoundStreamBlocks that follow belong to it.
  let current = null;
  const streams = [];
  for (const tag of tags) {
    if (tag.type === TAG_SOUND_STREAM_HEAD || tag.type === TAG_SOUND_STREAM_HEAD2) {
      const b = tag.body;
      if (b.length < 4) continue;
      // NOTE: byte 0 holds *playback* hints and its top nibble is reserved.
      // The real compression/rate/size live in byte 1. Reading byte 0 here
      // makes every stream look like uncompressed PCM.
      const streamFlags = b[1];
      const format = (streamFlags >> 4) & 0x0f;
      current = {
        format,
        rate: RATE[(streamFlags >> 2) & 0x03],
        bits: (streamFlags >> 1) & 0x01 ? 16 : 8,
        channels: streamFlags & 0x01 ? 2 : 1,
        chunks: [],
      };
      streams.push(current);
    } else if (tag.type === TAG_SOUND_STREAM_BLOCK && current) {
      const b = tag.body;
      if (current.format === 2) {
        // MP3 block: UI16 SampleCount, SI16 SeekSamples, then MP3 frames.
        if (b.length > 4) current.chunks.push(b.subarray(4));
      } else {
        current.chunks.push(b);
      }
    }
  }

  for (const s of streams) {
    if (s.chunks.length === 0) continue;
    const data = Buffer.concat(s.chunks);
    const meta = {
      format: FORMAT[s.format] ?? String(s.format),
      rate: s.rate,
      bits: s.bits,
      channels: s.channels,
      blocks: s.chunks.length,
    };
    if (s.format === 2) {
      results.push({ kind: "stream", ext: "mp3", data, meta });
    } else if (s.format === 0 || s.format === 3) {
      // Trim a trailing odd byte so the PCM frame count is whole.
      const even = data.length - (data.length % ((s.channels * s.bits) / 8));
      const body = data.subarray(0, even);
      const header = wavHeader({
        dataLength: body.length,
        sampleRate: s.rate,
        channels: s.channels,
        bitsPerSample: s.bits,
      });
      results.push({ kind: "stream", ext: "wav", data: Buffer.concat([header, body]), meta });
    } else {
      results.push({ kind: "stream", ext: null, data: null, meta, unsupported: true });
    }
  }

  return results;
}

/**
 * Order a SWF's sounds for presentation.
 *
 * A lesson movie typically holds one long narration (an event sound) plus
 * several shorter clips (the timeline streams inside sprites — individual
 * sentences the student replays line by line). All of them are lesson content,
 * so all of them are kept; the longest goes first because that is the full
 * reading, and the rest follow in the order Flash played them.
 *
 * Anything under `minBytes` is treated as a UI blip (a button click) and
 * dropped, so those don't get shipped as lesson audio.
 */
export function orderAudio(sounds, { minBytes = 8000 } = {}) {
  const usable = sounds.filter((s) => s.data && s.ext && s.data.length >= minBytes);
  if (usable.length === 0) return [];
  const longest = usable.reduce((best, s) => (s.data.length > best.data.length ? s : best));
  return [longest, ...usable.filter((s) => s !== longest)];
}
