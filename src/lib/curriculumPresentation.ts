/**
 * Professional Curriculum Presentation Formatter.
 *
 * Converts legacy crude file codes (e.g. "[ gh1-006 ]", "d001", "po01-01", "[ Page 006 ]")
 * into clean, elegant, user-centric commercial curriculum titles and subtitles.
 *
 * Preserves 100% of underlying file IDs, links, and backend audio bindings.
 */

export interface LessonPresentation {
  title: string;
  subtitle: string;
  badge?: string;
  code: string;
}

const G1_EVEN_PRIMARY_IDS = [
  "gh1-006", "gh1-008", "gh1-010", "gh1-012", "gh1-014", "gh1-016",
  "gh1-020", "gh1-022", "gh1-024", "gh1-026", "gh1-028", "gh1-030",
  "gh1-032", "gh1-034", "gh1-036", "gh1-038", "gh1-040", "gh1-042",
  "gh1-044", "gh1-046", "gh1-050", "gh1-052", "gh1-054",
  "gh1-056", "gh1-058", "gh1-060", "gh1-062", "gh1-064", "gh1-066",
  "gh1-068", "gh1-072", "gh1-074", "gh1-076", "gh1-078",
  "gh1-080", "gh1-082", "gh1-084", "gh1-088", "gh1-090", "gh1-092",
  "gh1-094", "gh1-096", "gh1-098", "gh1-100", "gh1-102", "gh1-106", "gh1-108",
  "gh1-110", "gh1-112", "gh1-116", "gh1-118", "gh1-120", "gh1-122",
];

function cleanBrackets(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/^\[\s*/, "")
    .replace(/\s*\]$/, "")
    .replace(/^:::\s*/, "")
    .replace(/\s*:::$/, "")
    .trim();
}

/**
 * Cleanly formats group and stage headings across courses.
 */
export function formatGroupTitle(courseSlug: string, rawLabel: string): string {
  const clean = cleanBrackets(rawLabel);

  if (courseSlug === "grammar1") {
    const stageTitles: Record<string, string> = {
      "제 1 단계": "제 1단계 : 기본 문장 구조 훈련 (Stage 1)",
      "제 2 단계": "제 2단계 : 어순 및 시제 훈련 (Stage 2)",
      "제 3 단계": "제 3단계 : 조동사 & 수동태 훈련 (Stage 3)",
      "제 4 단계": "제 4단계 : 의문사 & 부정구문 훈련 (Stage 4)",
      "제 5 단계": "제 5단계 : 접속사 & 복문 확장 훈련 (Stage 5)",
      "제 6 단계": "제 6단계 : 실전 고급 복합 구문 (Stage 6)",
    };
    return stageTitles[clean] || clean;
  }

  if (courseSlug === "grammar2") {
    return clean.replace(/(\d+)과\s*-\s*(\d+)과/, "제 $1과 ~ 제 $2과 핵심 패턴 영작");
  }

  if (courseSlug === "ld") {
    const m = clean.match(/(\d+)번\s*-\s*(\d+)번/);
    if (m) {
      const sectionNum = Math.ceil(parseInt(m[1], 10) / 50);
      return `Section ${sectionNum} · ${m[1]}회 ~ ${m[2]}회 실전 리스닝`;
    }
    return clean;
  }

  if (courseSlug === "reading") {
    const m = clean.match(/(\d+)~(\d+)번/);
    if (m) {
      const sectionNum = Math.ceil(parseInt(m[1], 10) / 40);
      return `Section ${sectionNum} · ${m[1]}회 ~ ${m[2]}회 원문 독해`;
    }
    return clean;
  }

  if (courseSlug === "phonics") {
    const map: Record<string, string> = {
      "중등01": "기본 발음 훈련 (HV Series)",
      "중등02": "모음 1 발음 훈련 (MV1 Series)",
      "중등03": "모음 2 발음 훈련 (MV2 Series)",
      "중등04": "모음 3 발음 훈련 (MV3 Series)",
    };
    return map[clean] || clean;
  }

  return clean;
}

/**
 * Returns a polished, professional title, subtitle, badge, and clean code for any lesson.
 */
export function formatLessonPresentation(
  courseSlug: string,
  lesson: {
    id: string;
    label?: string | null;
    menuLabel?: string | null;
    title?: string | null;
    unit?: number | null;
    variant?: string;
  },
): LessonPresentation {
  const id = lesson.id;
  const rawLabel = cleanBrackets(lesson.menuLabel || lesson.label || "");

  // 1. Grammar 1: 53 sequential lectures
  if (courseSlug === "grammar1") {
    const baseId = id.split("-").slice(0, 2).join("-");
    const idx = G1_EVEN_PRIMARY_IDS.indexOf(baseId);
    const lectureNum = idx >= 0 ? String(idx + 1).padStart(2, "0") : String(lesson.unit || id);

    const m = id.match(/^gh1-(\d+)/);
    const num = m ? parseInt(m[1], 10) : 0;
    let stageName = "기초 영작";
    let stageNum = 1;
    if (num <= 16) { stageNum = 1; stageName = "기본 문장 구조"; }
    else if (num <= 42) { stageNum = 2; stageName = "어순 및 시제"; }
    else if (num <= 54) { stageNum = 3; stageName = "조동사 & 수동태"; }
    else if (num <= 78) { stageNum = 4; stageName = "의문사 & 부정문"; }
    else if (num <= 108) { stageNum = 5; stageName = "접속사 & 복문"; }
    else { stageNum = 6; stageName = "고급 복합 구문"; }

    return {
      title: `${lectureNum}강 · 기초 영작 훈련`,
      subtitle: `제 ${stageNum}단계 (${stageName})`,
      badge: "🎙️ 마이크 채점",
      code: `Lesson ${lectureNum}`,
    };
  }

  // 2. Grammar 2: Pattern Composition
  if (courseSlug === "grammar2") {
    const m = id.match(/^gh2-(\d+)/);
    const lessonNum = m ? String(parseInt(m[1], 10)).padStart(2, "0") : id;
    const isKoreanScript = id.endsWith("-1") || lesson.variant === "script";
    return {
      title: `제 ${lessonNum}과 · 패턴 영작 훈련`,
      subtitle: isKoreanScript ? "한국어 대조 스크립트" : "English Model Pattern",
      badge: "🎙️ 마이크 채점",
      code: `Lesson ${lessonNum}`,
    };
  }

  // 3. Listen & Dictate (수능/토익 실전 듣기)
  if (courseSlug === "ld") {
    const m = id.match(/^d(\d+)/);
    const roundNum = m ? m[1] : id;
    const isKoreanScript = id.endsWith("-1") || lesson.variant === "script";
    return {
      title: `${roundNum}회 · 실전 듣기 평가`,
      subtitle: isKoreanScript ? "한국어 번역 및 어순 대조" : "수능/토익 딕테이션 훈련",
      badge: "🔊 원어민 음성",
      code: `Round ${roundNum}`,
    };
  }

  // 4. Reading (원문 리딩)
  if (courseSlug === "reading") {
    const m = id.match(/^pr(\d+)/);
    const roundNum = m ? m[1] : id;
    const isKoreanScript = id.endsWith("-1") || lesson.variant === "script";
    return {
      title: `${roundNum}회 · 원문 독해 & 리스닝`,
      subtitle: isKoreanScript ? "우리말 해석 & 구문 해설" : `Passage ${roundNum} · 전문 나레이션`,
      badge: "📖 직독직해",
      code: `Passage ${roundNum}`,
    };
  }

  // 5. Phonics (VOCA)
  if (courseSlug === "phonics") {
    if (id.startsWith("hv")) {
      const num = id.replace("hv-", "").replace("hv", "");
      return {
        title: `기본 발음 훈련 ${num}회`,
        subtitle: "Basic Consonant & Vowel Drill",
        badge: "🔊 원어민 발음",
        code: `HV-${num}`,
      };
    }
    const m = id.match(/^mv(\d+)-(\d+)/);
    if (m) {
      return {
        title: `모음 ${m[1]} 훈련 ${m[2]}회`,
        subtitle: `Vowel Practice Series ${m[1]}`,
        badge: "🔊 원어민 발음",
        code: `MV${m[1]}-${m[2]}`,
      };
    }
    return {
      title: `발음 훈련 · ${rawLabel || id}`,
      subtitle: "Phonics & Pronunciation",
      badge: "🔊 원어민 발음",
      code: id,
    };
  }

  // 6. Basics (Student Drills)
  if (courseSlug === "basics") {
    if (id.startsWith("po")) {
      const parts = id.replace("po", "").split("-");
      const unit = parts[0] || "01";
      const lessonNum = parts[1] || "01";
      return {
        title: `Unit ${unit} · 기본 문장 훈련 ${lessonNum}`,
        subtitle: "Foundational Sentence Drill",
        badge: "🔊 원어민 음성",
        code: `Unit ${unit}-${lessonNum}`,
      };
    }
    if (id.startsWith("qa")) {
      const parts = id.replace("qa", "").split("-");
      const unit = parts[0] || "01";
      const lessonNum = parts[1] || "01";
      return {
        title: `Unit ${unit} · 질문과 대답 ${lessonNum}`,
        subtitle: "Spoken Q&A Interaction",
        badge: "🔊 원어민 음성",
        code: `QA ${unit}-${lessonNum}`,
      };
    }
  }

  // 7. Middle (Men's drills)
  if (courseSlug === "middle") {
    const parts = id.replace("p", "").split("-");
    const unit = parts[0] || "01";
    const lessonNum = parts[1] || "01";
    return {
      title: `Unit ${unit} · 중등 실전 문장 ${lessonNum}`,
      subtitle: "Middle-School Spoken Drills",
      badge: "🔊 원어민 음성",
      code: `P ${unit}-${lessonNum}`,
    };
  }

  // 8. Adults Men & Women
  if (courseSlug === "adults-m" || courseSlug === "adults-w" || courseSlug === "adults") {
    const isMen = courseSlug === "adults-m" || id.startsWith("am");
    const cleanId = id.replace(/^(am|aw)/, "");
    const parts = cleanId.split("-");
    const unit = parts[0] || "01";
    const lessonNum = parts[1] || "01";
    return {
      title: `Unit ${unit} · ${isMen ? "남성" : "여성"} 비즈니스 ${lessonNum}`,
      subtitle: isMen ? "Men's Spoken Track" : "Women's Spoken Track",
      badge: "💼 비즈니스 회화",
      code: `Unit ${unit}-${lessonNum}`,
    };
  }

  // 9. Dialogue tracks (man, woman, student)
  if (["man", "woman", "student"].includes(courseSlug)) {
    const prefix = courseSlug === "man" ? "m" : courseSlug === "woman" ? "w" : "s";
    const cleanId = id.replace(new RegExp(`^${prefix}`), "");
    const parts = cleanId.split("-");
    const chapter = parts[0] || "1";
    const track = parts[1] || "1";
    const roleName = courseSlug === "man" ? "남성 실전 회화" : courseSlug === "woman" ? "여성 실전 회화" : "학생 실전 회화";
    return {
      title: `Chapter ${chapter} · ${roleName} ${track}`,
      subtitle: rawLabel && !rawLabel.includes(id) ? rawLabel : "Interactive Spoken Dialogue",
      badge: "🎙️ 실전 회화",
      code: `Ch ${chapter}-${track}`,
    };
  }

  // 10. CNN Listening
  if (courseSlug === "cnn") {
    const m = id.match(/(\d+)/);
    const num = m ? m[1] : id;
    return {
      title: `CNN 뉴스 ${num}회`,
      subtitle: rawLabel || "World News Listening",
      badge: "📺 뉴스 비디오",
      code: `CNN ${num}`,
    };
  }

  // 11. Chinese
  if (courseSlug === "chinese") {
    const parts = id.replace("c", "").split("-");
    const lessonNum = parts[0] || "1";
    const subNum = parts[1] || "1";
    return {
      title: `제 ${lessonNum}과 · 실전 중국어 회화 ${subNum}`,
      subtitle: rawLabel || "Chinese Conversation & Pinyin",
      badge: "🇨🇳 한/중 대조",
      code: `Lesson ${lessonNum}-${subNum}`,
    };
  }

  // Default fallback
  return {
    title: rawLabel || id,
    subtitle: courseSlug.toUpperCase(),
    badge: undefined,
    code: id,
  };
}
