import type { Tab } from "./types";

/**
 * The legacy top navigation, restored exactly.
 *
 * Every course folder's `menu.htm` renders the same ten-tab bar as a row of
 * images. The image *filenames* do not match their destinations — `MEN.jpg`
 * links to `middle/`, `STUDENT.jpg` to `basics/`, `VOCA.jpg` to `phonics/` —
 * so the labels below were read off the images themselves, not inferred from
 * the filename or the folder name. Order matches the original bar, left to
 * right.
 *
 * Three of these tabs are populations rather than single courses. Their
 * framesets prove it:
 *
 *   basics/index.htm  -> top: menu.htm  bottom: ../Student/shome.html
 *   middle/index.htm  -> top: menu.htm  bottom: ../Man/mhome.html
 *   adults/index.htm  -> top: menu.htm  bottom: ../Woman/whome.html
 *
 * That is, opening the STUDENTS tab landed you on the Student conversation
 * lessons, with the basics drills reachable from the same menu bar. The two
 * modalities were one destination, so they are one tab here too.
 */
export const TABS: Tab[] = [
  {
    slug: "voca",
    label: "VOCA",
    legacyImage: "VOCA.jpg",
    legacyIndex: "phonics/index.htm",
    courses: ["phonics"],
    blurb: "Pronunciation and vowel drills.",
  },
  {
    slug: "students",
    label: "STUDENTS",
    legacyImage: "STUDENT.jpg",
    legacyIndex: "basics/index.htm",
    courses: ["basics", "student"],
    blurb: "Foundational sentence practice, with the student conversation lessons.",
  },
  {
    slug: "men",
    label: "MEN",
    legacyImage: "MEN.jpg",
    legacyIndex: "middle/index.htm",
    courses: ["middle", "man"],
    blurb: "Sentence drills across twenty-five units, with the men's conversation lessons.",
  },
  {
    slug: "women",
    label: "WOMEN",
    legacyImage: "WOMEN.jpg",
    legacyIndex: "adults/index.htm",
    courses: ["adults", "woman"],
    blurb: "Conversation drills on two speaking tracks, with the women's lessons.",
  },
  {
    slug: "grammar1",
    label: "GRAMMAR I",
    legacyImage: "grammar1.gif",
    legacyIndex: "grammar1/index.htm",
    courses: ["grammar1"],
    blurb: "English composition: Korean prompts to translate.",
  },
  {
    slug: "grammar2",
    label: "GRAMMAR II",
    legacyImage: "grammar2.gif",
    legacyIndex: "grammar2/index.htm",
    courses: ["grammar2"],
    blurb: "Second-level composition, each lesson paired English and Korean.",
  },
  {
    slug: "ld",
    label: "Listen/Dictate",
    legacyImage: "LD.gif",
    legacyIndex: "LD/index.htm",
    courses: ["ld"],
    blurb: "Exam-style listening sets with dictation.",
  },
  {
    slug: "reading",
    label: "READING",
    legacyImage: "reading.gif",
    legacyIndex: "reading/index.htm",
    courses: ["reading"],
    blurb: "Numbered reading passages with narration.",
  },
  {
    slug: "cnn",
    label: "CNN",
    legacyImage: "CNN.jpg",
    legacyIndex: "CNN/index.htm",
    courses: ["cnn"],
    blurb: "News clips with English transcript, Korean translation and a glossary.",
  },
  {
    slug: "chinese",
    label: "中文",
    legacyImage: "(none — separate folder)",
    legacyIndex: "중국/Chinese.html",
    courses: ["chinese"],
    contentLang: "zh",
    blurb: "The conversation curriculum in Chinese, with pinyin guides.",
  },
  {
    slug: "gva",
    label: "GVA",
    legacyImage: "GVA.jpg",
    legacyIndex: "gva/index.htm",
    courses: [],
    blurb: "Sentence-structure theory and graded reading comprehension.",
    unavailable:
      "GVA was the companion Windows program. Its menu pointed at Firebird database files (.gdb) opened by GVA2000_Student.exe, not at web pages, so this material cannot run in a browser.",
    legacyModules: [
      "뼈대세우기 01–04",
      "영어문장구조론 01–10",
      "GVA 독해 001–200",
      "Reading Integraty 001–026",
    ],
  },
];

export const TAB_BY_SLUG = new Map(TABS.map((t) => [t.slug, t]));

/** The tab a given course belongs to. */
export function tabForCourse(courseSlug: string): Tab | null {
  return TABS.find((t) => t.courses.includes(courseSlug)) ?? null;
}
