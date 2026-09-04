/**
 * Content model for the K-IG 교육 courseware.
 *
 * The legacy site is ~2,700 hand-written HTML pages across 15 folders. Every
 * one of them is migrated into a single JSON file matching these types, stored
 * under /content. There is no database and no DAO layer: the file system is
 * the data layer, and Next.js reads it at build time.
 */

/** How a course's original content was delivered. Drives which player we render. */
export type CourseKind =
  /** HTML page + MP3 in a sounds/ folder. The large majority of the archive. */
  | "audio-drill"
  /** HTML shell whose only content was an embedded Flash movie. */
  | "flash-video"
  /** Windows Media video files with companion Hangul documents. */
  | "video"
  /** Firebird .gdb courseware belonging to the offline desktop trainer. */
  | "desktop-legacy";

/**
 * Some folders hold more than one drill series under one roof — `basics` has
 * both `po` (sentence practice) and `qa` (question/answer); `phonics` has
 * `hv`, `mv1`, `mv2`, `mv3`. A series is a named track inside a course.
 */
export interface Series {
  slug: string;
  title: string;
  /** Filename prefix that identifies this series in the legacy folder. */
  prefix: string;
}

/**
 * How a course's filenames encode position. The archive uses three schemes and
 * guessing between them silently mis-numbers whole courses, so each course
 * states its own.
 *
 * - `sequence`    — the digits are the lesson number. `d001` is round 1.
 * - `unit-lesson` — digits are unit + lesson concatenated. `po011` is unit 01,
 *                   lesson 1; a bare `po01` is that unit's cover page.
 * - `unit-part`   — unit and part are separated by a dash. `m1-1` is unit 1,
 *                   part 1 — here a trailing `-N` is a part, NOT a script pair.
 */
export type NumberingScheme = "sequence" | "unit-lesson" | "unit-part";

/**
 * How a lesson is titled in the interface.
 *
 * - `menu`   — use the label the legacy dropdown gave it. Right when the author
 *              wrote something meaningful there ("[ 7과 영어 ]").
 * - `number` — render "Lesson N" from the parsed number. Right when the menu
 *              label only restates the filename ("[ gh1-006 ]"), which tells a
 *              student nothing.
 */
export type LessonNaming = "menu" | "number";

export interface Course {
  /** URL segment, e.g. "ld". */
  slug: string;
  /** Slug of the legacy nav tab this course sits under. */
  tab: string;
  /** Original folder name on disk, e.g. "LD". */
  legacyFolder: string;
  numbering: NumberingScheme;
  /** Korean title as shown in the legacy navigation. */
  title: string;
  /** English working title, for the interface and for accessibility. */
  titleEn: string;
  kind: CourseKind;
  description: string;
  series: Series[];
  /** Defaults to "menu" when unset. */
  lessonNaming?: LessonNaming;
  /**
   * The language this course's *material* is in, when it isn't the English
   * curriculum. Distinct from the interface language: selecting Chinese in the
   * switcher surfaces Chinese-language courses, it does not translate lessons.
   */
  contentLang?: "zh";
  /** Populated by the extractor. */
  lessonCount: number;
}

/**
 * Legacy pages come in pairs: `d001.htm` and `d001-1.htm`. The base page is the
 * English listening drill; the `-1` page is its Korean-script companion, used
 * for reverse translation. They are separate pages in the archive but one
 * lesson pedagogically, so we keep both and link them.
 */
export type LessonVariant = "main" | "script";

/** A transcoded CNN clip. */
export interface VideoRef {
  src: string;
  legacySrc: string;
}

export interface AudioRef {
  /** Public path in the new app, e.g. "/audio/ld/d001.mp3". */
  src: string;
  /** Path as written in the legacy page, kept for traceability. */
  legacySrc: string;
  /** The legacy pages autostarted the first player and not the second. */
  autoplay: boolean;
}

/**
 * A lesson body is a short ordered list of typed blocks rather than a blob of
 * HTML. This is what makes the ~2,700 pages renderable by one component and
 * editable later without touching markup.
 */
export type Block =
  | { type: "heading"; text: string }
  | { type: "instruction"; text: string }
  /** Proper nouns / vocabulary shown before a dictation exercise. */
  | { type: "hints"; text: string }
  /** Numbered drill sentences, the most common body content. */
  | { type: "sentences"; items: SentenceItem[] }
  /**
   * `lang` is set where a lesson interleaves scripts — CNN transcripts pair
   * English with Korean, and the Chinese course pairs Korean prompts with
   * Chinese answers.
   */
  | { type: "paragraph"; text: string; lang?: "en" | "ko" | "zh" }
  /** The ①–⑤ radio row from the legacy answer form. */
  | { type: "choice"; options: string[] }
  /** The free-text dictation box. */
  | { type: "dictation"; rows: number }
  /** Phonics word lists, stored as a table of rows so the grid survives. */
  | { type: "wordgrid"; rows: string[][] };

export interface SentenceItem {
  /** Original number as printed on the page ("1", "12"). */
  n: string;
  text: string;
}

export interface Lesson {
  /** Stable id, unique within a course. Derived from the legacy filename. */
  id: string;
  /** Course slug this lesson belongs to. */
  course: string;
  /** Series slug, when the course has more than one track. */
  series: string | null;
  variant: LessonVariant;
  /** Id of the companion page (main <-> script), when one exists. */
  pairId: string | null;

  title: string;
  /** Printed label, e.g. "[ 제 001 회 ]" or "〔 K-IG 교육 - 011 〕". */
  label: string | null;
  /**
   * The name this lesson had in the legacy dropdown menu, e.g. "[ D 001 ]" or
   * "[ 7과 영어 ]". Hand-written by the original author, so it is a better
   * title than anything derived from the filename. Null when the course's menu
   * had no dropdown.
   */
  menuLabel: string | null;
  /** Parsed position, when the filename encodes one. */
  unit: number | null;
  part: number | null;
  /** Sort key within the course. */
  order: number;

  audio: AudioRef[];
  /** Non-empty only for CNN, whose lessons are video rather than audio. */
  video: VideoRef[];
  blocks: Block[];
  /** Phrasal chunk drill breakdowns for progressive speech training */
  chunkDrills?: { en: string; ko: string }[];

  /** Original file, relative to the archive root. Kept for verification. */
  legacyPath: string;
  /** Character encoding the original file was stored in. */
  legacyEncoding: string;
}

/** Index file written alongside the lessons, so pages don't read 2,700 files. */
export interface CourseIndex {
  course: Course;
  lessons: LessonSummary[];
  /** Groups recovered from the legacy menu; empty when it had no dropdown. */
  groups: LessonGroup[];
}

export interface LessonSummary {
  id: string;
  title: string;
  label: string | null;
  series: string | null;
  variant: LessonVariant;
  unit: number | null;
  part: number | null;
  order: number;
  hasAudio: boolean;
  hasVideo?: boolean;
  menuLabel: string | null;
}

// ---------------------------------------------------------------------------
// Legacy navigation
// ---------------------------------------------------------------------------

/**
 * One entry in the original ten-item top navigation bar. See src/lib/tabs.ts
 * for how these were recovered and why some hold more than one course.
 */
export interface Tab {
  slug: string;
  /** Label as printed on the original nav image. */
  label: string;
  /** The image the legacy bar used, kept for traceability. */
  legacyImage: string;
  /** Where the tab pointed in the original site. */
  legacyIndex: string;
  /** Course slugs reachable under this tab, in order. */
  courses: string[];
  blurb: string;
  /** Set when this tab's material is in a language other than English. */
  contentLang?: "zh";
  /** Set when the original content cannot run on the web; explains why. */
  unavailable?: string;
  /** For GVA: the module list its dropdown offered. */
  legacyModules?: string[];
}

/**
 * A group of lessons as the legacy menu presented them.
 *
 * Each `<select>` in a course's menu.htm is one group. Its first option is the
 * group's own label (pointing at cover.htm) and the rest are the lessons, in
 * the order a student saw them. These labels are hand-written — "[ 001번 -
 * 050번 ]", "[ 제 1 단계 ]" — and carry intent that filenames do not, so they
 * are preserved verbatim rather than regenerated.
 */
export interface LessonGroup {
  label: string;
  /** Lesson ids, in the menu's own order. */
  lessons: string[];
}
