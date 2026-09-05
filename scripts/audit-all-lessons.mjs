import fs from 'fs';
import path from 'path';

const CONTENT_DIR = 'content';

function readJson(p) {
  try {
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

function getCourseIndex(course) {
  return readJson(path.join(CONTENT_DIR, 'courses', `${course}.json`));
}

function getLesson(course, id) {
  return readJson(path.join(CONTENT_DIR, 'lessons', course, `${id}.json`));
}

function isEnglishText(text) {
  if (!text) return false;
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  const hangul = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;
  return latin >= hangul && latin > 0;
}

function hasKorean(text) {
  if (!text) return false;
  return /[\uAC00-\uD7AF\u1100-\u11FF]/.test(text);
}

function isChineseText(text) {
  if (!text) return false;
  return /[\u4E00-\u9FFF]/.test(text) && !hasKorean(text);
}

function cleanSentenceText(text) {
  if (!text) return '';
  return text
    .replace(/^\s*\d+[\.\)]\s*/, '')
    .replace(/\s*\/\s*/g, ' ')
    .trim();
}

function splitSentences(text) {
  if (!text) return [];
  return text
    .split(/(?<=[.?!])\s+/)
    .map((s) => cleanSentenceText(s))
    .filter((s) => s.length > 0);
}

function alignSentences(enSents, koSents) {
  if (enSents.length === 0 && koSents.length === 0) return [];
  if (enSents.length === 0) return koSents.map((k) => ({ en: '', ko: k }));
  if (koSents.length === 0) return enSents.map((e) => ({ en: e, ko: '' }));

  if (enSents.length === koSents.length) {
    return enSents.map((en, i) => ({ en, ko: koSents[i] }));
  }

  const result = [];
  if (enSents.length < koSents.length) {
    const numBuckets = enSents.length;
    const buckets = Array.from({ length: numBuckets }, () => []);
    koSents.forEach((k, idx) => {
      const bucketIdx = Math.min(Math.floor((idx / koSents.length) * numBuckets), numBuckets - 1);
      buckets[bucketIdx].push(k);
    });
    for (let i = 0; i < numBuckets; i++) {
      result.push({ en: enSents[i], ko: buckets[i].join(' ') });
    }
  } else {
    const numBuckets = koSents.length;
    const buckets = Array.from({ length: numBuckets }, () => []);
    enSents.forEach((e, idx) => {
      const bucketIdx = Math.min(Math.floor((idx / enSents.length) * numBuckets), numBuckets - 1);
      buckets[bucketIdx].push(e);
    });
    for (let i = 0; i < numBuckets; i++) {
      result.push({ en: buckets[i].join(' '), ko: koSents[i] });
    }
  }
  return result;
}

function getLessonContext(course, id) {
  const index = getCourseIndex(course);
  if (!index) return { prev: null, next: null, pair: null };

  const mains = index.lessons.filter((l) => l.variant === 'main');
  const list = index.lessons.find((l) => l.id === id)?.variant === 'script' ? index.lessons : mains;

  const i = list.findIndex((l) => l.id === id);
  const current = index.lessons.find((l) => l.id === id) ?? null;

  let pairId =
    current?.variant === 'main'
      ? index.lessons.find((l) => l.variant === 'script' && l.id.startsWith(`${id}-`))?.id
      : index.lessons.find((l) => l.variant === 'main' && id.startsWith(`${l.id}-`))?.id;

  if (course === 'grammar1') {
    const m = id.match(/^gh1-(\d+)(-\d+)?$/);
    if (m) {
      const num = parseInt(m[1], 10);
      const sub = m[2] || '';
      const pad = (n) => String(n).padStart(3, '0');
      if (num % 2 === 0) {
        const target = `gh1-${pad(num + 1)}${sub}`;
        if (index.lessons.some((l) => l.id === target)) pairId = target;
        else if (index.lessons.some((l) => l.id === `gh1-${pad(num + 1)}`)) pairId = `gh1-${pad(num + 1)}`;
      } else {
        const target = `gh1-${pad(num - 1)}${sub}`;
        if (index.lessons.some((l) => l.id === target)) pairId = target;
        else if (index.lessons.some((l) => l.id === `gh1-${pad(num - 1)}`)) pairId = `gh1-${pad(num - 1)}`;
      }
    }
  }

  return {
    prev: i > 0 ? list[i - 1] : null,
    next: i >= 0 && i < list.length - 1 ? list[i + 1] : null,
    pair: pairId ? (index.lessons.find((l) => l.id === pairId) ?? null) : null,
  };
}

function getPairButtonText(course, lessonId, isScript, pairLesson) {
  if (course === 'grammar1') {
    const m = lessonId.match(/^gh1-(\d+)/);
    if (m) {
      const num = parseInt(m[1], 10);
      return num % 2 === 0 ? '정답 및 영문 해설 보기' : '영작 연습 문제로 이동';
    }
  }

  if (course === 'ld') {
    return isScript ? '듣기 & 받아쓰기 시험으로 가기' : '한글 대본 & 영작 훈련 보기';
  }

  if (course === 'basics' && lessonId.startsWith('qa')) {
    return isScript ? '질문 듣기 시험으로 가기' : '한글 대본 및 예시 답안 보기';
  }

  if (!isScript) {
    return '한글 대본 보기';
  }

  if (pairLesson) {
    const hasEnglish = pairLesson.blocks.some((b) => {
      if (b.type === 'sentences' && b.items) {
        return b.items.some((it) => /[a-zA-Z]{4,}/.test(it.text));
      }
      if ((b.type === 'paragraph' || b.type === 'instruction') && b.text) {
        return /[a-zA-Z]{4,}/.test(b.text);
      }
      return false;
    });

    if (!hasEnglish && pairLesson.blocks.some((b) => b.type === 'dictation' || b.type === 'choice')) {
      return '듣기 & 받아쓰기 시험으로 가기';
    }
  }

  return '영어 본문으로 돌아가기';
}

// Exactly mirror LessonBody.tsx buildPairedSentences
function buildPairedSentences(blocks, pairBlocks, course, isScript, audioTracks = [], lessonId = '') {
  const result = [];

  // Skip chapter index pages (e.g. m1..m5, w1..w5, s1..s20, c1, c2) which are TOC menus, not sentence drills
  if (/^(m|w|s|c)\d+$/.test(lessonId)) {
    return result;
  }

  // 1. Basics QA track (qa011-1, etc.)
  if (course === 'basics' && lessonId.startsWith('qa')) {
    const sBlock = blocks.find((b) => b.type === 'sentences');
    const koParas = blocks.filter((b) => b.type === 'paragraph' && b.lang === 'ko');
    if (sBlock && koParas.length > 0) {
      sBlock.items.forEach((item, idx) => {
        result.push({
          index: idx + 1,
          numberLabel: item.n || String(idx + 1),
          targetText: cleanSentenceText(item.text),
          translationText: koParas[idx]?.text?.trim() || '',
        });
      });
      return result;
    }
  }

  // 1.5. student course
  if (course === 'student') {
    const allSentItems = blocks
      .filter((b) => b.type === 'sentences')
      .flatMap((b) => b.items || []);
    const koParas = blocks.filter((b) => b.type === 'paragraph' && b.lang === 'ko');

    if (allSentItems.length > 0) {
      allSentItems.forEach((item, idx) => {
        const ko = koParas[idx]?.text || '';
        result.push({
          index: idx + 1,
          numberLabel: item.n || String(idx + 1),
          targetText: cleanSentenceText(item.text),
          translationText: ko.trim(),
        });
      });
      return result;
    }
  }

  // 2. Dialogue courses (man, woman)
  if (['man', 'woman'].includes(course)) {
    const paragraphs = blocks.filter((b) => b.type === 'paragraph');
    const cleanParas = [];

    for (const p of paragraphs) {
      const t = (p.text || '').trim();
      if (!t) continue;
      if (t.includes('K-IG') || t.includes('<font') || t.includes('한/영') || /^Chapter\s+\d/i.test(t)) continue;
      if (/\s*:\s*$/.test(t)) continue;
      if (/^\d+\s+[A-Za-z]/.test(t)) continue;
      if (
        t.toLowerCase().includes('self-introduction') ||
        t.toLowerCase().includes('educational background') ||
        t.toLowerCase().includes('politics in korea')
      ) {
        if (t.length < 50) continue;
      }
      cleanParas.push({ text: t, isEn: isEnglishText(t) });
    }

    const altPairs = [];
    let i = 0;
    while (i < cleanParas.length - 1) {
      const curr = cleanParas[i];
      const next = cleanParas[i + 1];
      if (curr.isEn !== next.isEn) {
        const en = curr.isEn ? curr.text : next.text;
        const ko = curr.isEn ? next.text : curr.text;
        altPairs.push({ en, ko });
        i += 2;
      } else {
        break;
      }
    }

    if (altPairs.length > 0 && i >= cleanParas.length - 2) {
      altPairs.forEach((pair, idx) => {
        result.push({
          index: idx + 1,
          numberLabel: String(idx + 1),
          targetText: cleanSentenceText(pair.en),
          translationText: pair.ko.trim(),
        });
      });
      return result;
    }

    const enList = cleanParas.filter((p) => p.isEn);
    const koList = cleanParas.filter((p) => !p.isEn);
    const len = Math.min(enList.length, koList.length);

    for (let j = 0; j < len; j++) {
      result.push({
        index: j + 1,
        numberLabel: String(j + 1),
        targetText: cleanSentenceText(enList[j].text),
        translationText: koList[j].text.trim(),
      });
    }

    if (result.length > 0) return result;
  }

  // 3. Chinese
  if (course === 'chinese') {
    const paras = blocks.filter((b) => b.type === 'paragraph');
    const clean = [];

    for (const p of paras) {
      const t = (p.text || '').trim();
      if (!t) continue;
      if (t.includes('自我介绍') || t.includes('한/중') || /^Principle/i.test(t) || /^Chapter/i.test(t)) continue;
      if (t.includes('(인사)') || t.includes('(이름') || t.includes('(성격)') || t.includes('(취미)') || t.includes('(과목)') || t.includes('(봉사')) continue;
      clean.push(t);
    }

    const zhList = clean.filter((t) => isChineseText(t) || (!hasKorean(t) && /[\u4E00-\u9FFF]/.test(t)));
    const koList = clean.filter((t) => hasKorean(t));
    const len = Math.min(zhList.length, koList.length);

    for (let j = 0; j < len; j++) {
      result.push({
        index: j + 1,
        numberLabel: String(j + 1),
        targetText: cleanSentenceText(zhList[j]),
        translationText: koList[j].trim(),
      });
    }

    if (result.length > 0) return result;
  }

  // 4. Reading
  if (course === 'reading') {
    const mainText = blocks
      .filter((b) => b.type === 'instruction')
      .map((b) => b.text)
      .join(' ');
    const pairText = pairBlocks
      ? pairBlocks
          .filter((b) => b.type === 'instruction')
          .map((b) => b.text)
          .join(' ')
      : '';

    if (mainText || pairText) {
      const mainIsEn = isEnglishText(mainText);
      const enText = mainIsEn ? mainText : pairText;
      const koText = mainIsEn ? pairText : mainText;

      const pairs = alignSentences(splitSentences(enText), splitSentences(koText));
      pairs.forEach((p, idx) => {
        result.push({
          index: idx + 1,
          numberLabel: String(idx + 1),
          targetText: cleanSentenceText(p.en),
          translationText: p.ko.trim(),
        });
      });
      return result;
    }
  }

  // 5. Listening & Dictation (ld) - handled by dedicated LdLearningView
  if (course === 'ld') {
    return result;
  }

  // 6. Sentence blocks (flattened)
  const mainItems = blocks
    .filter((b) => b.type === 'sentences')
    .flatMap((b) => b.items || []);
  const pairItems = pairBlocks
    ? pairBlocks
        .filter((b) => b.type === 'sentences')
        .flatMap((b) => b.items || [])
    : [];

  if (mainItems.length > 0 && pairItems.length > 0) {
    const len = Math.max(mainItems.length, pairItems.length);

    for (let i = 0; i < len; i++) {
      const m = mainItems[i];
      const p = pairItems[i];
      const textM = m?.text ?? '';
      const textP = p?.text ?? '';

      let target = '';
      let translation = '';

      if (course === 'chinese') {
        target = isScript ? textP : textM;
        translation = isScript ? textM : textP;
      } else if (isEnglishText(textM) && !isEnglishText(textP)) {
        target = textM;
        translation = textP;
      } else if (!isEnglishText(textM) && isEnglishText(textP)) {
        target = textP;
        translation = textM;
      } else if (hasKorean(textM) && !hasKorean(textP)) {
        target = textP;
        translation = textM;
      } else if (!hasKorean(textM) && hasKorean(textP)) {
        target = textM;
        translation = textP;
      } else {
        if (hasKorean(textM)) {
          target = textP;
          translation = textM;
        } else {
          target = isScript ? textP : textM;
          translation = isScript ? textM : textP;
        }
      }

      result.push({
        index: i + 1,
        numberLabel: m?.n ?? p?.n ?? String(i + 1),
        targetText: cleanSentenceText(target),
        translationText: translation.trim(),
      });
    }
    return result;
  }

  // 7. Single-side Sentences with paragraph pair
  if (mainItems.length > 0) {
    const localKoParas = blocks.filter((b) => b.type === 'paragraph' && b.lang === 'ko');
    const pairParas = localKoParas.length > 0
      ? localKoParas
      : (pairBlocks ? pairBlocks.filter((b) => b.type === 'paragraph') : []);

    mainItems.forEach((item, i) => {
      const textM = item.text ?? '';
      const textP = pairParas[i]?.text ?? '';

      let target = '';
      let translation = '';

      if (isEnglishText(textM) && !isEnglishText(textP)) {
        target = textM;
        translation = textP;
      } else if (!isEnglishText(textM) && isEnglishText(textP)) {
        target = textP;
        translation = textM;
      } else if (hasKorean(textM)) {
        target = isEnglishText(textP) ? textP : '';
        translation = textM;
      } else {
        target = textM;
        translation = textP;
      }

      result.push({
        index: i + 1,
        numberLabel: item.n || String(i + 1),
        targetText: cleanSentenceText(target),
        translationText: translation.trim(),
      });
    });
    return result;
  }

  return result;
}

const courses = [
  'ld', 'reading', 'basics', 'middle', 'adults', 'phonics',
  'grammar1', 'grammar2', 'man', 'woman', 'student', 'chinese', 'cnn'
];

console.log('Auditing all courses and lessons...');

const report = {};

for (const course of courses) {
  const index = getCourseIndex(course);
  if (!index) continue;

  const courseReport = {
    totalLessons: index.lessons.length,
    zeroPairs: [],
    targetNotEnglish: [],
    translationNotKorean: [],
    missingTargetText: [],
    missingTranslationText: [],
    brokenPairLinks: [],
    scriptBackToEmptyMain: [],
  };

  for (const lSummary of index.lessons) {
    const id = lSummary.id;
    const lesson = getLesson(course, id);
    if (!lesson) continue;

    const ctx = getLessonContext(course, id);
    const pair = ctx.pair;
    const pairLesson = pair ? getLesson(course, pair.id) : null;
    const isScript = lesson.variant === 'script';

    // 1. Check pair navigation
    if (isScript && pair) {
      const btnLabel = getPairButtonText(course, id, isScript, pairLesson);
      if (btnLabel === '영어 본문으로 돌아가기') {
        const hasEn = pairLesson?.blocks.some((b) => {
          if (b.type === 'sentences' && b.items) return b.items.some((it) => isEnglishText(it.text));
          if (b.type === 'paragraph' && b.text) return isEnglishText(b.text);
          if (b.type === 'instruction' && b.text) return isEnglishText(b.text);
          return false;
        });
        if (!hasEn) {
          courseReport.scriptBackToEmptyMain.push({ id, pairId: pair.id, reason: 'Button says 영어 본문으로 돌아가기 but target has no English' });
        }
      }
    }

    if (lesson.pairId && !pair) {
      courseReport.brokenPairLinks.push({ id, targetPairId: lesson.pairId });
    }

    if (course === 'ld') {
      if (isScript) {
        const koSentences = [];
        for (const b of lesson.blocks) {
          if (b.type === 'instruction') {
            const txt = (b.text || '').trim();
            if (txt && !txt.includes('한글 대본을') && !txt.includes('받아쓰기를')) koSentences.push(cleanSentenceText(txt));
          } else if (b.type === 'paragraph') {
            const txt = (b.text || '').trim();
            if (txt) koSentences.push(cleanSentenceText(txt));
          } else if (b.type === 'sentences') {
            for (const it of b.items || []) {
              const txt = (it.text || '').trim();
              if (txt) koSentences.push(cleanSentenceText(txt));
            }
          }
        }
        if (koSentences.length === 0) {
          courseReport.zeroPairs.push(id);
        }
      } else {
        if (!lesson.audio || lesson.audio.length === 0) {
          courseReport.zeroPairs.push(id);
        }
      }
      continue;
    }

    if (['phonics', 'cnn'].includes(course)) continue;

    // 2. Build paired sentences
    const pairs = buildPairedSentences(lesson.blocks, pairLesson?.blocks, course, isScript, lesson.audio, id);

    if (pairs.length === 0) {
      // Is this expected to have pairs?
      if (lesson.blocks.some((b) => b.type === 'sentences' || b.type === 'paragraph')) {
        // Skip index/TOC pages (m1..m5, w1..w5, s1..s20, c1, c2)
        if (!/^(m|w|s|c)\d+$/.test(id)) {
          courseReport.zeroPairs.push(id);
        }
      }
      continue;
    }

    // Check each pair item
    for (let idx = 0; idx < pairs.length; idx++) {
      const p = pairs[idx];
      if (course !== 'chinese' && !p.targetText && course !== 'ld') {
        courseReport.missingTargetText.push({ id, index: idx + 1 });
      } else if (course !== 'chinese' && course !== 'ld' && !isEnglishText(p.targetText)) {
        courseReport.targetNotEnglish.push({ id, index: idx + 1, text: p.targetText });
      }

      if (!p.translationText) {
        courseReport.missingTranslationText.push({ id, index: idx + 1 });
      } else if (course !== 'chinese' && !hasKorean(p.translationText)) {
        courseReport.translationNotKorean.push({ id, index: idx + 1, text: p.translationText });
      }
    }
  }

  report[course] = courseReport;
}

console.log('=== AUDIT SUMMARY ===');
for (const [course, r] of Object.entries(report)) {
  console.log(`\n[${course.toUpperCase()}] Total: ${r.totalLessons}`);
  if (r.zeroPairs.length > 0) console.log(`  - Zero paired sentences: ${r.zeroPairs.length} (e.g. ${r.zeroPairs.slice(0, 3).join(', ')})`);
  if (r.missingTargetText.length > 0) console.log(`  - Missing targetText (no English): ${r.missingTargetText.length} items (e.g. ${r.missingTargetText.slice(0, 3).map(x => x.id).join(', ')})`);
  if (r.targetNotEnglish.length > 0) console.log(`  - TargetText is NOT English (Korean in English slot!): ${r.targetNotEnglish.length} items (e.g. ${r.targetNotEnglish.slice(0, 3).map(x => `${x.id}: ${x.text}`).join(', ')})`);
  if (r.missingTranslationText.length > 0) console.log(`  - Missing translationText (no Korean): ${r.missingTranslationText.length} items (e.g. ${r.missingTranslationText.slice(0, 3).map(x => x.id).join(', ')})`);
  if (r.translationNotKorean.length > 0) console.log(`  - Translation is NOT Korean: ${r.translationNotKorean.length} items (e.g. ${r.translationNotKorean.slice(0, 3).map(x => `${x.id}: ${x.text}`).join(', ')})`);
  if (r.scriptBackToEmptyMain.length > 0) console.log(`  - "영어 본문으로 돌아가기" leads to empty/no-English main: ${r.scriptBackToEmptyMain.length} (e.g. ${r.scriptBackToEmptyMain.slice(0, 3).map(x => `${x.id} -> ${x.pairId}`).join(', ')})`);
  if (r.brokenPairLinks.length > 0) console.log(`  - Broken pairId links: ${r.brokenPairLinks.length} (e.g. ${r.brokenPairLinks.slice(0, 3).map(x => `${x.id} -> ${x.targetPairId}`).join(', ')})`);
}
