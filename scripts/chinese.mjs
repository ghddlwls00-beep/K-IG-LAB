/**
 * "PASS-OFF FOR CHINESE" restoration.
 *
 * This course lives in its own folder (`중국`) beside the main archive rather
 * than inside it, and it is the same curriculum taught in Chinese: the Korean
 * prompts are identical to the English conversation lessons, with Chinese
 * rather than English as the target language. `c1-1.swf` and `m1-1.swf` both
 * open with "만나서 반갑습니다"; one answers "Nice to meet you", the other
 * "认识你很高兴".
 *
 * Three sources make up a lesson:
 *   *.swf              — the lesson text, drawn as glyphs (see swf-text.mjs)
 *   중국어음성/*.mp3    — narration, named to match the lesson
 *   중국어최종/*.hwp    — pinyin pronunciation guides and full lesson text
 *
 * Coverage is partial and the extractor reports it honestly: unit 1 is complete
 * (six lessons), while unit 2's parts exist only as uncompiled `.fla` source,
 * so only its cover can be restored.
 */

import fs from "node:fs";
import path from "node:path";
import { extractSwfText, textBlocks } from "./swf-text.mjs";
import { extractSwfAudio, orderAudio } from "./swf-audio.mjs";
import { readHwpText } from "./cnn.mjs";

const AUDIO_DIR = "중국어음성";
const DOCS_DIR = "중국어최종";

/** Chrome drawn into every movie; not lesson content. */
const CHROME = /^(pass-off for chinese|home|copyright|▶|◀|play|stop|한\/中|中文)/i;

/** Pinyin guides are named "N과병음.hwp" — lesson N's pronunciation. */
const PINYIN_DOC = /^(\d+)과병음\.hwp$/;

function cleanBlocks(blocks) {
  return blocks.filter((b) => {
    const text = b.type === "paragraph" || b.type === "heading" ? b.text : "";
    if (!text) return true;
    if (CHROME.test(text)) return false;
    if (/^copyright@/i.test(text)) return false;
    return true;
  });
}

/**
 * Splits a pinyin document into numbered entries.
 *
 * Each entry is a Chinese sentence followed by its romanisation, so the two
 * lines are paired rather than left as loose paragraphs.
 */
function pinyinBlocks(text) {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/　/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const items = [];
  let pending = null;
  for (const line of lines) {
    const numbered = line.match(/^(\d+)\s*(.+)$/);
    if (numbered) {
      if (pending) items.push(pending);
      pending = { n: numbered[1], text: numbered[2] };
    } else if (pending) {
      // The romanisation line that follows the Chinese one.
      pending.text += `\n${line}`;
      items.push(pending);
      pending = null;
    }
  }
  if (pending) items.push(pending);
  return items;
}

export function extractChinese(SRC, args, stats, CONTENT, PUBLIC_DIR, report) {
  const { status, done } = report;

  if (!fs.existsSync(SRC)) {
    stats.warnings.push(`Chinese folder not found: ${SRC}`);
    return;
  }

  const pages = fs
    .readdirSync(SRC)
    .filter((f) => /^c\d+(-\d+)?\.html?$/i.test(f))
    .sort();

  // Pinyin guides, keyed by unit.
  const pinyin = new Map();
  const docsDir = path.join(SRC, DOCS_DIR);
  if (fs.existsSync(docsDir)) {
    for (const file of fs.readdirSync(docsDir)) {
      const m = file.match(PINYIN_DOC);
      if (!m) continue;
      try {
        pinyin.set(parseInt(m[1], 10), pinyinBlocks(readHwpText(path.join(docsDir, file))));
      } catch (err) {
        stats.warnings.push(`hwp parse failed: 중국/${DOCS_DIR}/${file} — ${err.message}`);
      }
    }
  }

  const audioDir = path.join(SRC, AUDIO_DIR);
  const audioFiles = fs.existsSync(audioDir)
    ? fs.readdirSync(audioDir).filter((f) => /\.mp3$/i.test(f))
    : [];

  const lessons = [];
  const uncompiled = new Set(
    fs
      .readdirSync(SRC)
      .filter((f) => /^c\d+-\d+\.fla$/i.test(f))
      .map((f) => path.basename(f, ".fla")),
  );

  let scanned = 0;
  for (const page of pages) {
    const id = path.basename(page, path.extname(page));
    status(`chinese: ${id} (${++scanned}/${pages.length})`);

    const m = id.match(/^c(\d+)(?:-(\d+))?$/i);
    if (!m) continue;
    const unit = parseInt(m[1], 10);
    const part = m[2] ? parseInt(m[2], 10) : null;

    // --- text + audio from the movie ---
    let blocks = [];
    const audio = [];
    const swf = path.join(SRC, `${id}.swf`);
    if (fs.existsSync(swf)) {
      const buffer = fs.readFileSync(swf);
      try {
        blocks = cleanBlocks(textBlocks(extractSwfText(buffer)));
        stats.swfText += blocks.length;
      } catch (err) {
        stats.warnings.push(`swf text failed: 중국/${id}.swf — ${err.message}`);
      }
      try {
        const sounds = orderAudio(extractSwfAudio(buffer));
        const dest = path.join(PUBLIC_DIR, "audio", "chinese");
        sounds.forEach((sound, i) => {
          const name = sounds.length === 1 ? `${id}.${sound.ext}` : `${id}-swf${i + 1}.${sound.ext}`;
          if (args.media && !args.dryRun) {
            fs.mkdirSync(dest, { recursive: true });
            fs.writeFileSync(path.join(dest, name), sound.data);
            stats.audio++;
          }
          audio.push({ src: `/audio/chinese/${name}`, legacySrc: `${id}.swf`, autoplay: false });
        });
        if (sounds.length) stats.swfParsed++;
      } catch (err) {
        stats.warnings.push(`swf audio failed: 중국/${id}.swf — ${err.message}`);
      }
    } else {
      stats.warnings.push(`missing swf: 중국/${id}.swf`);
    }

    // --- narration from the audio folder ---
    // Files are named for the lesson (c1-1.mp3) plus numbered sub-clips
    // (c1-1-1.mp3), which are the individual sentences.
    const matching = audioFiles
      .filter((f) => {
        const stem = path.basename(f, path.extname(f));
        return stem === id || stem.startsWith(`${id}-`);
      })
      .sort((a, b) => a.length - b.length || a.localeCompare(b));

    if (args.media && !args.dryRun && matching.length) {
      const dest = path.join(PUBLIC_DIR, "audio", "chinese");
      fs.mkdirSync(dest, { recursive: true });
      for (const file of matching) {
        const to = path.join(dest, file);
        if (!fs.existsSync(to)) {
          fs.copyFileSync(path.join(audioDir, file), to);
          stats.audio++;
        }
      }
    }
    for (const file of matching) {
      audio.push({ src: `/audio/chinese/${file}`, legacySrc: `${AUDIO_DIR}/${file}`, autoplay: false });
    }

    // --- pinyin, on the unit's first lesson ---
    const guide = pinyin.get(unit);
    if (guide && part === 1) {
      blocks.push({ type: "sentences", items: guide });
    }

    // The topic line ("礼节 (인사)") is the lesson's real name. Section markers
    // like "Principle 3" are structure, and taking one as the title — which the
    // generic "first heading" rule does — names every lesson meaninglessly.
    const topic = blocks.find(
      (b) => b.type === "paragraph" && /[\u4E00-\u9FFF]/.test(b.text) && /[가-힣]/.test(b.text),
    );
    const heading = topic ?? blocks.find((b) => b.type === "heading");
    lessons.push({
      id,
      course: "chinese",
      series: "c",
      variant: "main",
      pairId: null,
      title: heading?.text ?? id,
      label: heading?.text ?? null,
      menuLabel: null,
      unit,
      part,
      order: lessons.length,
      audio,
      video: [],
      blocks,
      legacyPath: `중국/${page}`,
      legacyEncoding: "utf-8",
    });
    stats.pages++;
  }

  if (lessons.length === 0) {
    done(`${"chinese".padEnd(9)}    0 lessons`);
    return;
  }

  lessons.sort((a, b) => (a.unit ?? 0) - (b.unit ?? 0) || (a.part ?? 0) - (b.part ?? 0));
  lessons.forEach((l, i) => (l.order = i));

  // Group by unit, mirroring how the course's own menu movies present it.
  const groups = [];
  for (const unit of [...new Set(lessons.map((l) => l.unit))].sort((a, b) => a - b)) {
    groups.push({
      label: `제 ${unit} 과 · 第 ${unit} 课`,
      lessons: lessons.filter((l) => l.unit === unit).map((l) => l.id),
    });
  }

  // Parts that were never compiled to SWF cannot be restored — only the
  // authoring source survives — so say so rather than leaving a silent hole.
  const missing = [...uncompiled].filter((stem) => !lessons.some((l) => l.id === stem));
  if (missing.length) {
    stats.warnings.push(
      `중국: ${missing.length} lesson(s) exist only as uncompiled .fla source and cannot be restored: ${missing.sort().join(", ")}`,
    );
  }

  if (!args.dryRun) {
    const outDir = path.join(CONTENT, "lessons", "chinese");
    fs.mkdirSync(outDir, { recursive: true });
    for (const lesson of lessons) {
      fs.writeFileSync(path.join(outDir, `${lesson.id}.json`), JSON.stringify(lesson, null, 2), "utf-8");
    }
    fs.mkdirSync(path.join(CONTENT, "courses"), { recursive: true });
    fs.writeFileSync(
      path.join(CONTENT, "courses", "chinese.json"),
      JSON.stringify(
        {
          course: "chinese",
          tab: "chinese",
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
        },
        null,
        2,
      ),
      "utf-8",
    );
  }

  stats.groups += groups.length;
  done(
    `${"chinese".padEnd(9)} ${String(lessons.length).padStart(4)} lessons  (${groups.length} units` +
      `${missing.length ? `, ${missing.length} uncompiled` : ""})`,
  );
}
