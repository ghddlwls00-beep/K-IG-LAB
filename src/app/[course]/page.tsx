import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { T } from "@/components/LanguageProvider";
import { getCourseIndex, getCourses } from "@/lib/content";
import { tabForCourse } from "@/lib/tabs";
import { lessonDisplay } from "@/lib/courses";
import type { LessonSummary } from "@/lib/types";

export function generateStaticParams() {
  return getCourses().map((c) => ({ course: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course: string }>;
}): Promise<Metadata> {
  const { course } = await params;
  const index = getCourseIndex(course);
  return { title: index?.course.titleEn ?? "PASS-OFF" };
}

export default async function CoursePage({ params }: { params: Promise<{ course: string }> }) {
  const { course: slug } = await params;
  const index = getCourseIndex(slug);
  if (!index) notFound();

  const { course, lessons, groups } = index;
  const tab = tabForCourse(course.slug);
  const byId = new Map(lessons.map((l) => [l.id, l]));

  // Korean script pages are reached from their English lesson via the "View the
  // Korean script" button, so listing both here would double every section for
  // no gain. A script page with no English counterpart is still listed, so that
  // nothing in the archive becomes unreachable.
  const mainIds = new Set(lessons.filter((l) => l.variant === "main").map((l) => l.id));
  const hasEnglishPair = (l: LessonSummary) =>
    l.variant === "script" && [...mainIds].some((id) => l.id.startsWith(`${id}-`));
  const listed = lessons.filter((l) => !hasEnglishPair(l));
  const listedIds = new Set(listed.map((l) => l.id));

  // The legacy menu's own grouping wins when we recovered one; otherwise fall
  // back to the series/unit structure implied by the filenames.
  const sections = (
    groups.length > 0
      ? groups.map((g) => ({
          label: g.label,
          lessons: g.lessons
            .filter((id) => listedIds.has(id))
            .map((id) => byId.get(id))
            .filter((l) => l !== undefined),
        }))
      : fallbackSections(course.series, listed)
  ).filter((section) => section.lessons.length > 0);

  return (
    <main className="mx-auto max-w-4xl px-5 py-14">
      <nav className="mb-8">
        <Link
          href={tab ? `/t/${tab.slug}` : "/"}
          className="link-underline font-mono text-[11px] tracking-wide text-ink-soft hover:text-ink"
        >
          ← {tab?.label ?? <T k="nav.allSections" />}
        </Link>
      </nav>

      <header className="mb-12 border-b border-line pb-8">
        <h1 className="text-[2rem] leading-tight font-medium tracking-tight">{course.titleEn}</h1>
        <p className="mt-2 text-[15px] text-ink-soft">{course.title}</p>
        <p className="mt-4 max-w-lg text-[13.5px] leading-relaxed text-ink-soft">
          {course.description}
        </p>
        <p className="mt-5 font-mono text-[11px] tabular-nums text-ink-faint">
          <T k={listed.length === 1 ? "course.lesson" : "course.lessons"} count={listed.length} />
          {lessons.length > listed.length ? (
            <>
              {" · "}
              <T
                k={
                  lessons.length - listed.length === 1
                    ? "course.scriptPaired"
                    : "course.scriptsPaired"
                }
                count={lessons.length - listed.length}
              />
            </>
          ) : null}
          {sections.length > 0 ? (
            <>
              {" · "}
              <T
                k={sections.length === 1 ? "course.group" : "course.groups"}
                count={sections.length}
              />
            </>
          ) : null}
        </p>
      </header>

      <div className="flex flex-col gap-12">
        {/*
          Keyed by position: group labels come from the legacy dropdowns and
          nothing guarantees two of them differ.
        */}
        {sections.map((section, index) => (
          <section key={`${index}-${section.label}`}>
            <h2 className="mb-4 font-mono text-[11px] tracking-[0.18em] text-ink-faint uppercase">
              {section.label}
            </h2>
            {/*
              Sections are capped rather than allowed to run to full height: LD
              has 276 rounds per group, and letting one group fill the viewport
              hides the fact that another follows. Scrolling within the section
              keeps every group's heading reachable.

              Bordered tiles with real gaps here, not a `gap-px` grid — that
              would leave the container colour showing as a block on any
              partial last row.
            */}
            <ul className="grid max-h-[21rem] grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
              {section.lessons.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    href={`/${course.slug}/${lesson.id}`}
                    className="flex h-full flex-col justify-between gap-2 border border-line px-3 py-2.5 hover:border-line-strong hover:bg-raised focus-visible:bg-raised"
                  >
                    <span className="text-[13px] leading-snug">
                      {(() => {
                        const shown = lessonDisplay(course, lesson);
                        return "n" in shown ? (
                          <T k="lesson.numbered" vars={{ n: shown.n }} />
                        ) : (
                          shown.text
                        );
                      })()}
                    </span>
                    <span className="flex items-center justify-between font-mono text-[10.5px] text-ink-faint">
                      <span className="tabular-nums">{lesson.id}</span>
                      {lesson.variant === "script" ? <span>한글</span> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}

/**
 * Courses whose menu had no dropdowns (basics, middle, adults) still have an
 * implied structure in their filenames: the series they belong to, then the
 * unit. This reproduces that rather than dumping several hundred flat tiles.
 */
function fallbackSections(
  series: { slug: string; title: string }[],
  lessons: LessonSummary[],
): { label: string; lessons: LessonSummary[] }[] {
  const out: { label: string; lessons: LessonSummary[] }[] = [];
  for (const s of series) {
    const group = lessons.filter((l) => l.series === s.slug);
    if (group.length > 0) out.push({ label: s.title, lessons: group });
  }
  const claimed = new Set(out.flatMap((s) => s.lessons.map((l) => l.id)));
  const rest = lessons.filter((l) => !claimed.has(l.id));
  if (rest.length > 0) out.push({ label: "기타 · Other", lessons: rest });
  return out;
}
