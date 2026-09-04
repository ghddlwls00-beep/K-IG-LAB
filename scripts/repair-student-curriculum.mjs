import fs from 'fs';
import path from 'path';

const studentDir = 'content/lessons/student';
const studentCourseJsonPath = 'content/courses/student.json';

// Comprehensive Curriculum Map for Student Course (20 Units)
const CURRICULUM = {
  1: {
    chapterKo: '자기소개',
    chapterEn: 'Self-introduction',
    parts: {
      1: { en: 'Greeting', ko: '인사말' },
      2: { en: 'Name, School & Age', ko: '이름, 학교 및 나이' },
      3: { en: 'Personality - Outgoing Person', ko: '성격 - 외향적인 성격' },
      4: { en: 'Hobby', ko: '취미' },
      5: { en: 'Favorite Subject', ko: '좋아하는 과목' },
      6: { en: 'Helping Hand & Volunteering', ko: '봉사활동과 남 돕기' }
    }
  },
  2: {
    chapterKo: '가족 소개',
    chapterEn: 'Family Introduction',
    parts: {
      1: { en: 'Greeting', ko: '인사말' },
      2: { en: 'Family Unit', ko: '가족 구성' },
      3: { en: "Father and Mother's Job", ko: '부모님의 직업' },
      4: { en: 'Life at My House', ko: '우리 집의 일상' },
      5: { en: "Sister's School & Talents", ko: '자매의 학교와 재능' },
      6: { en: "Sister's Hobby", ko: '자매의 취미' }
    }
  },
  3: {
    chapterKo: '친구 소개',
    chapterEn: 'Friend Introduction',
    parts: {
      1: { en: 'Greeting', ko: '인사말' },
      2: { en: "Friend's Personality", ko: '친구의 성격' },
      3: { en: "Friend's Talents", ko: '친구의 특기와 재능' },
      4: { en: "Friend's Dreams", ko: '친구의 장래희망' }
    }
  },
  4: {
    chapterKo: '친척 소개',
    chapterEn: 'Relative Introduction',
    parts: {
      1: { en: 'Greeting', ko: '인사말' },
      2: { en: 'Aunts, Uncles and Cousins', ko: '이모, 삼촌, 사촌들' },
      3: { en: "Father's Brother and Sister", ko: '친가 친척' },
      4: { en: "Mother's Brother and Sister", ko: '외가 친척' },
      5: { en: 'My Favorite Relative', ko: '가장 좋아하는 친척' },
      6: { en: "Oldest Uncle's Talents", ko: '큰삼촌의 재능' }
    }
  },
  5: {
    chapterKo: '학교 갈 준비 및 학교생활',
    chapterEn: 'Getting Ready for School / At School',
    parts: {
      1: { en: 'Getting Ready for School', ko: '등교 준비' },
      2: { en: 'On the Way to School', ko: '등굣길' },
      3: { en: 'Morning Session', ko: '아침 조회' },
      4: { en: 'Introducing My Class', ko: '우리 반 소개' },
      5: { en: 'My School Friends', ko: '학교 친구들' }
    }
  },
  6: {
    chapterKo: '우리 학교 선생님',
    chapterEn: 'My School Teacher',
    parts: {
      1: { en: 'Introducing My School', ko: '우리 학교 소개' },
      2: { en: 'Introducing My Teacher', ko: '선생님 소개' },
      3: { en: "Teacher's Personality", ko: '선생님의 성품' },
      4: { en: 'My Teacher Helps Me', ko: '나를 도와주시는 선생님' }
    }
  },
  7: {
    chapterKo: '학원 생활',
    chapterEn: 'At the Academy',
    parts: {
      1: { en: 'Introducing Academies', ko: '다니는 학원 소개' },
      2: { en: 'My Favorite Academy', ko: '가장 좋아하는 학원' },
      3: { en: 'Friends and Teachers at Academy', ko: '학원 친구들과 선생님' }
    }
  },
  8: {
    chapterKo: '방과 후와 집에서의 일상',
    chapterEn: 'After School / At Home',
    parts: {
      1: { en: 'After School & Coming Home', ko: '방과 후 귀가' },
      2: { en: 'Doing Homework', ko: '숙제하기' },
      3: { en: 'Dinnertime with Family', ko: '가족과의 저녁 식사' },
      4: { en: 'Watching TV & Going to Bed', ko: 'TV 시청과 취침' }
    }
  },
  9: {
    chapterKo: '나의 하루 일과',
    chapterEn: 'What Do I Do Every Day?',
    parts: {
      1: { en: 'What I Do in the Morning', ko: '나의 아침 일과' },
      2: { en: 'What I Do in the Afternoon', ko: '나의 오후 일과' },
      3: { en: 'What I Do in the Evening', ko: '나의 저녁 일과' }
    }
  },
  10: {
    chapterKo: '평일 일과',
    chapterEn: 'What Do I Do during the Week?',
    parts: {
      1: { en: 'My Weekday Schedule', ko: '평일 일정' },
      2: { en: 'The Start of a New Week (Monday)', ko: '새로운 주의 시작 (월요일)' },
      3: { en: 'Everyday School & Academies', ko: '매일의 학교와 학원 생활' },
      4: { en: 'Midweek Activities', ko: '주중 활동' },
      5: { en: 'Friday Wrap-up', ko: '금요일 마무리' }
    }
  },
  11: {
    chapterKo: '주말 일과',
    chapterEn: 'What Do I Do during the Weekends?',
    parts: {
      1: { en: 'Saturday Afternoon', ko: '토요일 오후' },
      2: { en: 'Saturday Night & Family Outing', ko: '토요일 밤과 가족 외식' },
      3: { en: 'Sunday Morning & Church', ko: '일요일 아침과 교회' },
      4: { en: 'Sunday Afternoon Leisure', ko: '일요일 오후의 여가' }
    }
  },
  12: {
    chapterKo: '방학 생활',
    chapterEn: 'What I Do During School Vacations',
    parts: {
      1: { en: 'School Vacations', ko: '방학 맞이' },
      2: { en: 'Summer Vacation', ko: '여름 방학' },
      3: { en: 'Winter Vacation', ko: '겨울 방학' },
      4: { en: 'My Dream Vacation', ko: '내가 꿈꾸는 방학 여행' }
    }
  },
  13: {
    chapterKo: '내가 존경하는 인물',
    chapterEn: 'Whom Do I Respect?',
    parts: {
      1: { en: 'My Favorite Kind of Books & Biographies', ko: '내가 좋아하는 위인전' },
      2: { en: 'The Person I Respect the Most (Admiral Yi Sun-sin)', ko: '가장 존경하는 인물 (이순신 장군)' },
      3: { en: 'Why I Respect Him', ko: '내가 이순신 장군을 존경하는 이유' }
    }
  },
  14: {
    chapterKo: '나의 미래 꿈 (교사)',
    chapterEn: 'My Future Dream Job (Teacher)',
    parts: {
      1: { en: 'My Dream for the Future', ko: '미래를 향한 나의 꿈' },
      2: { en: 'Reasons for Wanting to Become a Teacher', ko: '교사가 되고 싶은 이유' },
      3: { en: 'How I Will Achieve My Dream', ko: '꿈을 이루기 위한 노력' }
    }
  },
  15: {
    chapterKo: '내가 흠모하는 인물 (거스 히딩크)',
    chapterEn: 'Whom Do I Admire? (Guus Hiddink)',
    parts: {
      1: { en: 'The World Cup Memories', ko: '월드컵의 감동' },
      2: { en: 'The Person I Admire the Most (Coach Hiddink)', ko: '가장 흠모하는 인물 (히딩크 감독)' },
      3: { en: 'Why I Admire Him', ko: '히딩크 감독을 존경하는 이유' }
    }
  },
  16: {
    chapterKo: '또 다른 장래희망 (통역사)',
    chapterEn: 'My Other Dream Job (Interpreter)',
    parts: {
      1: { en: 'My Other Dream Job', ko: '또 하나의 꿈' },
      2: { en: 'Why I Want to Become an Interpreter', ko: '통역사가 되고 싶은 이유' },
      3: { en: 'How I Will Fulfill My Dream', ko: '통역사가 되기 위한 다짐' }
    }
  },
  17: {
    chapterKo: '한국의 역사',
    chapterEn: 'History of Korea',
    parts: {
      1: { en: 'How Korea Was Founded', ko: '고조선의 건국' },
      2: { en: 'The Three Kingdoms Era', ko: '삼국 시대' },
      3: { en: 'Independence of Korea & Civil War', ko: '광복과 6.25 전쟁' },
      4: { en: 'Development and Prosperity of Korea', ko: '대한민국의 발전과 번영' }
    }
  },
  18: {
    chapterKo: '한국의 전통 명절',
    chapterEn: 'Traditional Korean Holidays',
    parts: {
      1: { en: 'Introduction to Korean Holidays', ko: '한국의 명절 소개' },
      2: { en: "Lunar New Year's Day (Seollal)", ko: '설날과 차례' },
      3: { en: 'Harvest Moon Festival (Chuseok)', ko: '추석과 송편' }
    }
  },
  19: {
    chapterKo: '한국의 문화',
    chapterEn: 'Korean Culture',
    parts: {
      1: { en: 'Korean Culture is Unique', ko: '독창적인 한국 문화' },
      2: { en: 'Traditional Clothing (Hanbok)', ko: '전통 의상 (한복)' },
      3: { en: 'Traditional Housing (Hanok)', ko: '전통 가옥 (한옥)' },
      4: { en: 'Our Language (Hangul)', ko: '우리말과 훈민정음 (한글)' }
    }
  },
  20: {
    chapterKo: '한국의 명소',
    chapterEn: 'Famous Places in Korea',
    parts: {
      1: { en: 'Location and Geography of Korea', ko: '한국의 위치와 지리' },
      2: { en: 'Famous Attractions Overview', ko: '한국의 주요 관광 명소' },
      3: { en: 'Korean Folk Village', ko: '한국민속촌' },
      4: { en: 'Historic City of Gyeongju', ko: '역사의 도시 경주' },
      5: { en: 'Jeju Island and Mt. Halla', ko: '제주도와 한라산' }
    }
  }
};

function norm(s) {
  return s.replace(/\s+/g, ' ').replace(/[^a-zA-Z\uAC00-\uD7AF0-9]/g, '');
}

function cleanPiece(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/^[\s\/\.\,\-]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isEnglishSentence(text) {
  // Check if string is predominantly English
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  // Exclude Hangul inside parentheses like (이순신) or known proper nouns like 한국
  const stripped = text
    .replace(/\([^)]*[\uAC00-\uD7AF][^)]*\)/g, '')
    .replace(/한국\s*(Elementary\s*School|Apartment|Apartmemt)?/gi, '');
  const hangulOutside = (stripped.match(/[\uAC00-\uD7AF]/g) || []).length;

  return latin >= 10 && hangulOutside === 0;
}

export function repairLesson(rawLesson) {
  const unit = rawLesson.unit || 1;
  const part = rawLesson.part || 1;
  const info = CURRICULUM[unit] || { chapterEn: `Unit ${unit}`, chapterKo: `단원 ${unit}`, parts: {} };
  const partInfo = info.parts[part] || { en: `Part ${part}`, ko: `파트 ${part}` };

  const label = `Chapter ${unit}. ${info.chapterEn} (${info.chapterKo})`;
  const title = `${partInfo.en} (${partInfo.ko})`;
  const menuLabel = `${unit}-${part}. ${partInfo.en}`;

  const rawBlocks = rawLesson.blocks || [];
  if (rawBlocks.length === 0) {
    return {
      ...rawLesson,
      label,
      title,
      menuLabel,
      blocks: [
        { type: 'instruction', text: `${label} - ${title}` }
      ]
    };
  }

  // 1. Gather all non-chrome strings
  const lines = [];
  for (const b of rawBlocks) {
    if (b.type === 'heading') continue;
    let t = (b.text || '').trim();
    if (!t) continue;
    if (t.includes('K-IG') || t.includes('<font') || t.includes('한/영') || /^Chapter\s+\d/i.test(t)) continue;
    if (t.endsWith(':')) continue;
    lines.push(t);
  }

  // If last line is a chapter/subtopic repetition, pop it
  if (lines.length > 0) {
    const last = lines[lines.length - 1];
    if (last.length < 45 && !last.includes('.') && !last.includes('/') && isEnglishSentence(last)) {
      lines.pop();
    }
  }

  // 2. Extract chunk pairs
  const chunkPairs = [];
  for (const line of lines) {
    let s = line.replace(/^\/\s*/, '').trim();
    const m = s.match(/^([\uAC00-\uD7AF\s\,\.\?\!\(\)\'\-]+?)([a-zA-Z].*)$/);
    if (m && m[1].trim().length > 1 && m[2].trim().length > 1) {
      const ko = cleanPiece(m[1]);
      const en = cleanPiece(m[2]);
      if (ko.length > 1 && en.length > 1) {
        chunkPairs.push({ ko, en });
      }
    }
  }

  // 3. Extract pure English sentences and pure Korean candidate sentences
  const enCandidates = [];
  const koCandidates = [];

  for (const line of lines) {
    const s = line.replace(/^\/\s*/, '').trim();
    const m = s.match(/^([\uAC00-\uD7AF\s\,\.\?\!\(\)\'\-]+?)([a-zA-Z].*)$/);
    // Skip chunk lines
    if (line.startsWith('/') || (m && m[1].trim().length > 1 && m[2].trim().length > 1)) continue;

    if (isEnglishSentence(line)) {
      const cleanEn = cleanPiece(line);
      // Skip title/subtopic lines
      if (cleanEn.length > 8 && !enCandidates.some(e => norm(e) === norm(cleanEn))) {
        if (!cleanEn.startsWith('Chapter') && !cleanEn.startsWith('Self-introduction') && !cleanEn.startsWith('Family Introduction')) {
          enCandidates.push(cleanEn);
        }
      }
    } else {
      const cleanKo = cleanPiece(line);
      if (cleanKo.length > 5 && !koCandidates.some(k => norm(k) === norm(cleanKo))) {
        koCandidates.push(cleanKo);
      }
    }
  }

  // Filter out koCandidates that are merely sub-chunk prefixes
  const koSentences = koCandidates.filter(k => {
    const isChunkPrefix = chunkPairs.some(cp => (norm(cp.ko) === norm(k) || norm(cp.ko).startsWith(norm(k))) && k.length < 18);
    const isPrefixOfOther = koCandidates.some(other => other !== k && norm(other).startsWith(norm(k)) && k.length < 18);
    return !isChunkPrefix && !isPrefixOfOther;
  });

  const enSentences = [...enCandidates];

  // 4. Align English and Korean sentences
  const paired = [];
  const usedKo = new Set();

  for (let i = 0; i < enSentences.length; i++) {
    const en = enSentences[i];
    let bestKo = '';
    let bestScore = -1;
    let bestIndex = -1;

    for (let j = 0; j < koSentences.length; j++) {
      if (usedKo.has(j)) continue;
      const ko = koSentences[j];
      let score = 0;

      for (const cp of chunkPairs) {
        const enNorm = norm(en).toLowerCase();
        const koNorm = norm(ko);
        const cpEnNorm = norm(cp.en).toLowerCase();
        const cpKoNorm = norm(cp.ko);
        if (enNorm.includes(cpEnNorm) && koNorm.includes(cpKoNorm)) {
          score += 10;
        }
      }

      if (score === 0 && Math.abs(i - j) <= 1) {
        score += (2 - Math.abs(i - j));
      }

      if (score > bestScore) {
        bestScore = score;
        bestKo = ko;
        bestIndex = j;
      }
    }

    if (bestIndex !== -1 && bestScore >= 0) {
      usedKo.add(bestIndex);
      paired.push({ en, ko: bestKo });
    } else {
      paired.push({ en, ko: '' });
    }
  }

  for (let j = 0; j < koSentences.length; j++) {
    if (!usedKo.has(j)) {
      const emptySlot = paired.find(p => !p.ko);
      if (emptySlot) {
        emptySlot.ko = koSentences[j];
        usedKo.add(j);
      }
    }
  }

  // 5. Build structured blocks
  const blocks = [];
  blocks.push({
    type: 'instruction',
    text: `${label} - ${title}`
  });

  if (paired.length > 0) {
    blocks.push({
      type: 'sentences',
      items: paired.map((p, i) => ({
        n: String(i + 1),
        text: p.en
      }))
    });

    for (const p of paired) {
      if (p.ko) {
        blocks.push({
          type: 'paragraph',
          text: p.ko,
          lang: 'ko'
        });
      }
    }
  }

  // Unique chunk drills
  const uniqueChunks = [];
  for (const cp of chunkPairs) {
    if (!uniqueChunks.some(u => norm(u.en) === norm(cp.en))) {
      uniqueChunks.push(cp);
    }
  }

  return {
    ...rawLesson,
    label,
    title,
    menuLabel,
    blocks,
    chunkDrills: uniqueChunks.length > 0 ? uniqueChunks : undefined
  };
}

// Execute migration across all files
export function runMigration() {
  const files = fs.readdirSync(studentDir).filter(f => f.endsWith('.json')).sort();
  console.log(`Processing ${files.length} student files...`);

  const updatedSummaries = [];
  const groupsMap = {};

  for (const f of files) {
    const p = path.join(studentDir, f);
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));

    // Handle index files (s1.json ~ s5.json)
    if (!f.includes('-')) {
      const u = raw.unit || parseInt(f.replace('s','').replace('.json',''), 10) || 1;
      const cInfo = CURRICULUM[u];
      if (cInfo) {
        raw.label = `Chapter ${u}. ${cInfo.chapterEn} (${cInfo.chapterKo})`;
        raw.title = `${cInfo.chapterEn} (${cInfo.chapterKo}) 개요`;
        raw.menuLabel = `Chapter ${u} 개요`;
      }
      fs.writeFileSync(p, JSON.stringify(raw, null, 2), 'utf-8');
      updatedSummaries.push({
        id: raw.id,
        title: raw.title,
        label: raw.label,
        series: raw.series,
        variant: raw.variant,
        unit: raw.unit,
        part: raw.part,
        order: raw.order,
        hasAudio: false,
        menuLabel: raw.menuLabel
      });
      continue;
    }

    // Lesson file (e.g. s1-1.json)
    const repaired = repairLesson(raw);
    fs.writeFileSync(p, JSON.stringify(repaired, null, 2), 'utf-8');

    const u = repaired.unit || 1;
    if (!groupsMap[u]) {
      const cInfo = CURRICULUM[u] || { chapterEn: `Unit ${u}`, chapterKo: `단원 ${u}` };
      groupsMap[u] = {
        title: `Chapter ${u}. ${cInfo.chapterKo} (${cInfo.chapterEn})`,
        lessons: []
      };
    }
    groupsMap[u].lessons.push(repaired.id);

    updatedSummaries.push({
      id: repaired.id,
      title: repaired.title,
      label: repaired.label,
      series: repaired.series,
      variant: repaired.variant,
      unit: repaired.unit,
      part: repaired.part,
      order: repaired.order,
      hasAudio: (repaired.audio || []).length > 0,
      menuLabel: repaired.menuLabel
    });
  }

  // Update content/courses/student.json
  const groups = Object.keys(groupsMap)
    .map(Number)
    .sort((a,b) => a - b)
    .map(u => groupsMap[u]);

  const courseJson = {
    course: 'student',
    tab: 'students',
    lessonCount: updatedSummaries.length,
    groups,
    lessons: updatedSummaries.sort((a,b) => a.order - b.order)
  };

  fs.writeFileSync(studentCourseJsonPath, JSON.stringify(courseJson, null, 2), 'utf-8');
  console.log(`Successfully migrated ${files.length} student files and updated ${studentCourseJsonPath}!`);
}

runMigration();
