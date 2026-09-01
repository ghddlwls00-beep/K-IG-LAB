import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { T } from "@/components/LanguageProvider";
import { getCourse, getTab, getTabs } from "@/lib/content";

export function generateStaticParams() {
  return getTabs().map((t) => ({ tab: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tab: string }>;
}): Promise<Metadata> {
  const { tab } = await params;
  return { title: getTab(tab)?.label ?? "PASS-OFF" };
}

export default async function TabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab: slug } = await params;
  const tab = getTab(slug);
  if (!tab) notFound();

  const courses = tab.courses.map((c) => getCourse(c)).filter((c) => c !== null);

  return (
    <main className="mx-auto max-w-4xl px-5 py-16">
      <header className="mb-12">
        <h1 className="text-[2rem] leading-tight font-medium tracking-tight">{tab.label}</h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-soft">{tab.blurb}</p>
      </header>

      {/*
        Three of the tabs held two kinds of material at once — MP3 drills and
        the Flash conversation lessons — because the original frameset opened
        the conversation home with the drill menu above it. Showing both here
        keeps that pairing intact.
      */}
      {courses.length > 0 ? (
        <ul className="border-t border-line">
          {courses.map((course) => (
            <li key={course.slug} className="border-b border-line">
              <Link
                href={`/${course.slug}`}
                className="group flex items-baseline gap-5 py-5 hover:bg-raised focus-visible:bg-raised"
              >
                <span className="flex-1">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[16px] font-medium tracking-tight">{course.titleEn}</span>
                    <span className="font-mono text-[11px] tracking-wide text-ink-faint uppercase">
                      {course.kind === "flash-video" ? (
                        <T k="tab.conversation" />
                      ) : course.kind === "video" ? (
                        <T k="tab.video" />
                      ) : (
                        <T k="tab.drills" />
                      )}
                    </span>
                  </span>
                  <span className="mt-1 block max-w-md text-[13.5px] leading-relaxed text-ink-soft">
                    {course.description}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[12px] tabular-nums text-ink-faint">
                  {course.lessonCount}
                </span>
                <span
                  aria-hidden
                  className="pr-1 font-mono text-sm text-ink-faint transition-transform duration-200 ease-out group-hover:translate-x-1 group-hover:text-ink"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {tab.unavailable ? (
        <section className="mt-4 border border-line p-6">
          <h2 className="mb-2 font-mono text-[11px] tracking-[0.18em] text-ink-faint uppercase">
            <T k="tab.unavailable" />
          </h2>
          <p className="max-w-xl text-[14px] leading-relaxed text-ink-soft">{tab.unavailable}</p>

          {tab.legacyModules ? (
            <>
              <p className="mt-5 mb-2 font-mono text-[11px] tracking-[0.18em] text-ink-faint uppercase">
                <T k="tab.contained" />
              </p>
              <ul className="flex flex-col gap-1">
                {tab.legacyModules.map((m) => (
                  <li key={m} className="text-[14px] text-ink-soft">
                    {m}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <p className="mt-5 font-mono text-[11px] text-ink-faint">
            legacy: {tab.legacyIndex}
          </p>
        </section>
      ) : null}
    </main>
  );
}
