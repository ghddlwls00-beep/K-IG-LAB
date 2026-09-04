import type { Course } from "./types";

/**
 * The course taxonomy, derived from how the legacy archive is already
 * organized on disk. Folder names and filename prefixes are load-bearing here:
 * the extractor uses them to decide which course and series a page belongs to.
 *
 * Counts in comments are from the folder audit and are approximate until the
 * extractor runs; `lessonCount` on each Course is filled in at extraction time.
 */
export const COURSES: Omit<Course, "lessonCount">[] = [
  // ---------------------------------------------------------------------
  // Audio drill courses — HTML page + MP3. ~2,400 pages, the bulk of the app.
  // ---------------------------------------------------------------------
  {
    slug: "ld",
    tab: "ld",
    legacyFolder: "LD",
    numbering: "sequence",
    title: "수능영어 듣기",
    titleEn: "Listening & Dictation",
    kind: "audio-drill",
    description:
      "Exam-style listening sets. Each round pairs an English dictation drill with a Korean script page for reverse translation.",
    series: [{ slug: "d", title: "듣기 회차", prefix: "d" }],
  },
  {
    slug: "reading",
    tab: "reading",
    legacyFolder: "reading",
    numbering: "sequence",
    title: "리딩",
    titleEn: "Reading",
    kind: "audio-drill",
    description: "Numbered reading passages with narration, each with a companion script page.",
    series: [{ slug: "pr", title: "리딩", prefix: "pr" }],
  },
  {
    slug: "basics",
    tab: "students",
    legacyFolder: "basics",
    numbering: "unit-lesson",
    title: "STUDENTS",
    titleEn: "Student Drills",
    kind: "audio-drill",
    description:
      "Foundational sentence practice. Two tracks: K-IG 교육 sentence drills and spoken question-and-answer sets.",
    series: [
      { slug: "po", title: "문장 연습", prefix: "po" },
      { slug: "qa", title: "질문과 대답", prefix: "qa" },
    ],
  },
  {
    slug: "middle",
    tab: "men",
    legacyFolder: "middle",
    numbering: "unit-lesson",
    title: "MEN",
    titleEn: "Men's Drills",
    kind: "audio-drill",
    description: "Middle-school level sentence drills organized into twenty-five units.",
    series: [{ slug: "p", title: "문장 연습", prefix: "p" }],
  },
  {
    slug: "adults",
    tab: "women",
    legacyFolder: "adults",
    numbering: "unit-lesson",
    title: "WOMEN",
    titleEn: "Women's Drills",
    kind: "audio-drill",
    description: "Adult conversation drills, split into a men's and a women's speaking track.",
    series: [
      { slug: "am", title: "남성 트랙", prefix: "am" },
      { slug: "aw", title: "여성 트랙", prefix: "aw" },
    ],
  },
  {
    slug: "phonics",
    tab: "voca",
    legacyFolder: "phonics",
    numbering: "sequence",
    title: "VOCA",
    titleEn: "Vocabulary & Pronunciation",
    kind: "audio-drill",
    description: "Pronunciation and vowel drills across four graded series.",
    series: [
      { slug: "hv", title: "기본 발음", prefix: "hv-" },
      { slug: "mv1", title: "모음 1", prefix: "mv1-" },
      { slug: "mv2", title: "모음 2", prefix: "mv2-" },
      { slug: "mv3", title: "모음 3", prefix: "mv3-" },
    ],
  },
  {
    slug: "grammar1",
    tab: "grammar1",
    legacyFolder: "grammar1",
    numbering: "sequence",
    title: "영문법 1",
    titleEn: "Grammar 1",
    kind: "audio-drill",
    description: "English composition exercises: Korean prompts to be translated into English.",
    // The legacy menu labelled these "[ gh1-006 ]" — the filename, not a name.
    lessonNaming: "number",
    series: [{ slug: "gh1", title: "영작 연습", prefix: "gh1-" }],
  },
  {
    slug: "grammar2",
    tab: "grammar2",
    legacyFolder: "grammar2",
    numbering: "sequence",
    title: "영문법 2",
    titleEn: "Grammar 2",
    kind: "audio-drill",
    description: "Second-level composition exercises, each with a paired answer page.",
    lessonNaming: "number",
    series: [{ slug: "gh2", title: "영작 연습", prefix: "gh2-" }],
  },

  // ---------------------------------------------------------------------
  // Flash video courses — the HTML was only a 950-byte swfobject shell, so the
  // real content lives in the SWF and is recovered by the SWF extractor.
  // ---------------------------------------------------------------------
  {
    slug: "man",
    tab: "men",
    legacyFolder: "Man",
    numbering: "unit-part",
    title: "MEN · 회화",
    titleEn: "Men's Conversation",
    kind: "flash-video",
    description: "Twenty units of spoken lessons, originally delivered as Flash movies.",
    series: [{ slug: "m", title: "회화", prefix: "m" }],
  },
  {
    slug: "woman",
    tab: "women",
    legacyFolder: "Woman",
    numbering: "unit-part",
    title: "WOMEN · 회화",
    titleEn: "Women's Conversation",
    kind: "flash-video",
    description: "Twenty units of spoken lessons, originally delivered as Flash movies.",
    series: [{ slug: "w", title: "회화", prefix: "w" }],
  },
  {
    slug: "student",
    tab: "students",
    legacyFolder: "Student",
    numbering: "unit-part",
    title: "STUDENTS · 회화",
    titleEn: "Student Conversation",
    kind: "flash-video",
    description: "Twenty units of student-level spoken lessons, originally Flash movies.",
    series: [{ slug: "s", title: "회화", prefix: "s" }],
  },

  // ---------------------------------------------------------------------
  // The same curriculum taught in Chinese, from its own folder beside the
  // main archive. The Korean prompts match the English conversation lessons
  // exactly; only the target language differs.
  // ---------------------------------------------------------------------
  {
    slug: "chinese",
    tab: "chinese",
    legacyFolder: "중국",
    numbering: "unit-part",
    title: "중국어 회화",
    titleEn: "K-IG 교육 for Chinese",
    kind: "flash-video",
    contentLang: "zh",
    description:
      "The conversation curriculum in Chinese — the same Korean prompts as the English lessons, answered in Chinese, with pinyin pronunciation guides.",
    series: [{ slug: "c", title: "회화", prefix: "c" }],
  },

  // ---------------------------------------------------------------------
  // Video course — Windows Media files with companion Hangul documents.
  // Needs transcoding to MP4 before it can ship; extractor records it only.
  // ---------------------------------------------------------------------
  {
    slug: "cnn",
    tab: "cnn",
    legacyFolder: "CNN",
    numbering: "sequence",
    title: "CNN 리스닝",
    titleEn: "CNN Listening",
    kind: "video",
    description:
      "News clips transcoded from the original Windows Media files, each with its English transcript, Korean translation and vocabulary notes.",
    series: [{ slug: "cnn", title: "클립", prefix: "" }],
  },
];

export const COURSE_BY_SLUG = new Map(COURSES.map((c) => [c.slug, c]));
export const COURSE_BY_FOLDER = new Map(COURSES.map((c) => [c.legacyFolder, c]));

/** Folders deliberately excluded from the web app. */
export const EXCLUDED_FOLDERS = [
  "gva", // 231 Firebird .gdb files — offline desktop trainer
  "GVA 2000 Pro", // Windows installers for that trainer
  "css", // legacy stylesheet, superseded by Tailwind
  "images", // legacy chrome images, superseded by the new design
  "scripts", // legacy swfobject helpers
  "objects", // single stray swf
  "sources", // stock photography
] as const;

/**
 * How a lesson should be titled in the interface.
 *
 * Returns a number when the course numbers its lessons, so the caller can
 * render it through the translations ("Lesson 6" / "レッスン 6" / "第 6 课").
 * Otherwise returns the text the legacy author wrote.
 */
export function lessonDisplay(
  course: { lessonNaming?: "menu" | "number" },
  lesson: { menuLabel?: string | null; label?: string | null; id: string; unit?: number | null },
): { n: number } | { text: string } {
  if (course.lessonNaming === "number" && typeof lesson.unit === "number" && !Number.isNaN(lesson.unit)) {
    return { n: lesson.unit };
  }
  return { text: lesson.menuLabel ?? lesson.label ?? lesson.id };
}
