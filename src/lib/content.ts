import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Course, CourseIndex, Lesson, LessonGroup, LessonSummary, Tab } from "./types";
import { COURSES } from "./courses";
import { TABS } from "./tabs";

/**
 * Content access. Every read here is a file read at build time — there is no
 * database, no client, no connection pool. Next.js statically generates the
 * pages, so these functions never run in the browser or in a request path.
 */

const CONTENT_DIR = path.join(process.cwd(), "content");

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return null;
  }
}

/** Courses that actually have extracted content on disk. */
export function getCourses(): Course[] {
  return COURSES.map((c) => {
    const index = readJson<{ lessonCount: number }>(
      path.join(CONTENT_DIR, "courses", `${c.slug}.json`),
    );
    return { ...c, lessonCount: index?.lessonCount ?? 0 };
  }).filter((c) => c.lessonCount > 0);
}

export function getCourse(slug: string): Course | null {
  return getCourses().find((c) => c.slug === slug) ?? null;
}

export function getCourseIndex(slug: string): CourseIndex | null {
  const course = getCourse(slug);
  if (!course) return null;
  const index = readJson<{ lessons: LessonSummary[]; groups?: LessonGroup[] }>(
    path.join(CONTENT_DIR, "courses", `${slug}.json`),
  );
  if (!index) return null;
  return { course, lessons: index.lessons, groups: index.groups ?? [] };
}

export function getLesson(course: string, id: string): Lesson | null {
  // Guard against path traversal via the URL segment.
  if (!/^[\w.-]+$/.test(course) || !/^[\w.-]+$/.test(id)) return null;
  return readJson<Lesson>(path.join(CONTENT_DIR, "lessons", course, `${id}.json`));
}

/** All (course, lesson) pairs, for generateStaticParams. */
export function getAllLessonParams(): { course: string; lesson: string }[] {
  const out: { course: string; lesson: string }[] = [];
  for (const course of getCourses()) {
    const index = getCourseIndex(course.slug);
    if (!index) continue;
    for (const lesson of index.lessons) {
      out.push({ course: course.slug, lesson: lesson.id });
    }
  }
  return out;
}

/**
 * Neighbouring lessons for prev/next navigation, and the paired script page
 * when one exists — the legacy site had no way to move between lessons at all,
 * so this is new behavior the content model makes possible.
 */
export function getLessonContext(course: string, id: string) {
  const index = getCourseIndex(course);
  if (!index) return { prev: null, next: null, pair: null };

  const mains = index.lessons.filter((l) => l.variant === "main");
  const list = index.lessons.find((l) => l.id === id)?.variant === "script" ? index.lessons : mains;

  const i = list.findIndex((l) => l.id === id);
  const current = index.lessons.find((l) => l.id === id) ?? null;

  let pairId =
    current?.variant === "main"
      ? index.lessons.find((l) => l.variant === "script" && l.id.startsWith(`${id}-`))?.id
      : index.lessons.find((l) => l.variant === "main" && id.startsWith(`${l.id}-`))?.id;

  // Grammar1 special pairing: Even numbered lessons are Korean exercises, odd numbered lessons are English answer sheets
  if (course === "grammar1") {
    const m = id.match(/^gh1-(\d+)(-\d+)?$/);
    if (m) {
      const num = parseInt(m[1], 10);
      const sub = m[2] || "";
      const pad = (n: number) => String(n).padStart(3, "0");
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

// ---------------------------------------------------------------------------
// Legacy tab navigation
// ---------------------------------------------------------------------------

/** Tabs, with courses that have no extracted content marked unavailable. */
export function getTabs(): Tab[] {
  const available = new Set(getCourses().map((c) => c.slug));
  return TABS.map((tab) => {
    const courses = tab.courses.filter((c) => available.has(c));
    if (tab.unavailable || courses.length > 0) return { ...tab, courses };
    return {
      ...tab,
      courses,
      unavailable:
        "This section has no extracted content yet. Run the extractor against the legacy archive.",
    };
  });
}

export function getTab(slug: string): Tab | null {
  return getTabs().find((t) => t.slug === slug) ?? null;
}

/** Map of course slug -> tab slug, so the bar can highlight from any page. */
export function getCourseTabMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const tab of TABS) for (const c of tab.courses) map[c] = tab.slug;
  return map;
}

/** Lesson groups exactly as the legacy dropdown menu presented them. */
export function getCourseGroups(slug: string): LessonGroup[] {
  const index = readJson<{ groups?: LessonGroup[] }>(
    path.join(CONTENT_DIR, "courses", `${slug}.json`),
  );
  return index?.groups ?? [];
}

/** Pre-computed authentic English scripts for Listen & Dictate lessons. */
export function getLdEnglishScript(id: string): { n: string; ko: string; en: string }[] | null {
  const baseId = id.replace(/-1$/, "");
  const dict = readJson<Record<string, { n: string; ko: string; en: string }[]>>(
    path.join(CONTENT_DIR, "ld_english_scripts.json"),
  );
  return dict ? dict[baseId] ?? null : null;
}
