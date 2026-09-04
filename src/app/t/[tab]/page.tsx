import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { T } from "@/components/LanguageProvider";
import { getCourse, getTab, getTabs } from "@/lib/content";
import { TAB_IMAGES } from "@/lib/tabImages";

export function generateStaticParams() {
  return getTabs().map((t) => ({ tab: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tab: string }>;
}): Promise<Metadata> {
  const { tab } = await params;
  return { title: getTab(tab)?.label ?? "K-IG 교육" };
}

export default async function TabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab: slug } = await params;
  const tab = getTab(slug);
  if (!tab) notFound();

  const courses = tab.courses.map((c) => getCourse(c)).filter((c) => c !== null);
  const img = TAB_IMAGES[tab.slug];

  return (
    <main>
      {/*
        A photo band echoing the landing sections this page was entered from,
        so arriving here doesn't feel like leaving that page behind. Same
        scrim direction, same big medium-weight heading, same fadeUp entrance.
      */}
      <header className="relative flex min-h-[46vh] flex-col justify-end overflow-hidden border-b border-line px-[9vw] py-12">
        {img ? (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 bg-raised">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.src}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              fetchPriority="high"
              decoding="async"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(0deg, var(--surface) 0%, color-mix(in srgb, var(--surface) 82%, transparent) 42%, color-mix(in srgb, var(--surface) 15%, transparent) 78%)",
              }}
            />
          </div>
        ) : null}

        <div
          className="relative z-10 max-w-2xl"
          style={{ animation: "fadeUp var(--dur-slow) var(--ease) both" }}
        >
          <h1 className="text-[clamp(40px,6vw,64px)] leading-[1.06] font-medium tracking-tight text-ink">
            {tab.label}
          </h1>
          <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-ink-soft">{tab.blurb}</p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-14">

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
      </div>
    </main>
  );
}
