import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { T } from "@/components/LanguageProvider";
import { getCourseIndex, getCourses } from "@/lib/content";
import { tabForCourse } from "@/lib/tabs";
import { lessonDisplay } from "@/lib/courses";
import { formatGroupTitle, formatLessonPresentation } from "@/lib/curriculumPresentation";
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
  return { title: index?.course.titleEn ?? "K-IG 교육" };
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
    l.variant === "script" && (
      [...mainIds].some((id) => l.id.startsWith(`${id}-`)) ||
      (course.slug === "grammar1" && [...mainIds].some((id) => {
        const m = id.match(/^gh1-(\d+)$/);
        if (!m) return false;
        const nextId = `gh1-${String(parseInt(m[1], 10) + 1).padStart(3, "0")}`;
        return l.id === nextId || l.id.startsWith(`${nextId}-`);
      }))
    );
  const listed = lessons.filter((l) => !hasEnglishPair(l));
  const listedIds = new Set(listed.map((l) => l.id));

  // The legacy menu's own grouping wins when we recovered one; otherwise fall
  // back to the series/unit structure implied by the filenames.
  const sections = (
    groups.length > 0
      ? groups.map((g) => ({
          label: formatGroupTitle(course.slug, g.label || (g as { title?: string }).title || "Group"),
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

      <header
        className="mb-12 border-b border-line pb-8"
        style={{ animation: "fadeUp var(--dur-slow) var(--ease) both" }}
      >
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
            <ul className="grid max-h-[25rem] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
              {section.lessons.map((lesson) => {
                const pres = formatLessonPresentation(course.slug, lesson);
                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/${course.slug}/${lesson.id}`}
                      className="group flex h-full flex-col justify-between gap-2.5 rounded-xl border border-line bg-surface p-3.5 transition-all duration-200 hover:border-ink hover:bg-raised/70 hover:shadow-xs focus-visible:bg-raised"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-mono text-[11px] font-semibold text-primary tracking-wide">
                            {pres.code}
                          </span>
                          {pres.badge && (
                            <span className="rounded-md bg-raised px-1.5 py-0.5 text-[10px] font-medium text-ink-soft group-hover:text-ink">
                              {pres.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[13.5px] font-semibold leading-snug text-ink group-hover:text-ink">
                          {pres.title}
                        </span>
                        {pres.subtitle && (
                          <span className="text-[11.5px] text-ink-soft line-clamp-1">
                            {pres.subtitle}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-line/50 pt-2 font-mono text-[10.5px] text-ink-faint">
                        <span className="tabular-nums">{lesson.id}</span>
                        <span className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink">
                          학습하기 →
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
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
