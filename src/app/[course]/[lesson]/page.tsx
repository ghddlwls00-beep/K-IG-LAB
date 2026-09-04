import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AudioPlayer } from "@/components/AudioPlayer";
import { LessonBody } from "@/components/LessonBody";
import { VideoPlayer } from "@/components/VideoPlayer";
import { T } from "@/components/LanguageProvider";
import { getAllLessonParams, getCourse, getLesson, getLessonContext } from "@/lib/content";
import { tabForCourse } from "@/lib/tabs";
import { lessonDisplay } from "@/lib/courses";

export function generateStaticParams() {
  return getAllLessonParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course: string; lesson: string }>;
}): Promise<Metadata> {
  const { course, lesson: id } = await params;
  const lesson = getLesson(course, id);
  return { title: lesson ? (lesson.menuLabel ?? lesson.label ?? lesson.id) : "K-IG 교육" };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ course: string; lesson: string }>;
}) {
  const { course, lesson: id } = await params;
  const lesson = getLesson(course, id);
  if (!lesson) notFound();

  const { prev, next, pair } = getLessonContext(course, id);
  const courseInfo = getCourse(course);
  const tab = tabForCourse(course);
  const isScript = lesson.variant === "script";

  // Defensive: content extracted before the dedup fix can still list the same
  // track twice, so collapse by src here rather than requiring a re-extract.
  const audio = lesson.audio.filter((a, i, all) => all.findIndex((x) => x.src === a.src) === i);
  const video = lesson.video ?? [];
  const fromFlash = lesson.blocks.length === 0 && audio.length > 0;

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <nav className="mb-10 flex items-center justify-between gap-4 font-mono text-[11px]">
        <Link href={`/${course}`} className="link-underline text-ink-soft hover:text-ink">
          ← {courseInfo?.titleEn ?? course}
        </Link>
        <span className="flex items-center gap-4">
          {prev ? (
            <Link
              href={`/${course}/${prev.id}`}
              className="text-ink-soft transition-transform duration-200 ease-out hover:-translate-x-0.5 hover:text-ink"
            >
              ← {prev.id}
            </Link>
          ) : null}
          {next ? (
            <Link
              href={`/${course}/${next.id}`}
              className="text-ink-soft transition-transform duration-200 ease-out hover:translate-x-0.5 hover:text-ink"
            >
              {next.id} →
            </Link>
          ) : null}
        </span>
      </nav>

      <header className="mb-9" style={{ animation: "fadeUp var(--dur-slow) var(--ease) both" }}>
        <div className="mb-3 flex flex-wrap items-center gap-2.5 font-mono text-[11px] tracking-wide text-ink-faint">
          <span className="uppercase">{tab?.label}</span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">{lesson.id}</span>
          {isScript ? (
            <span className="border border-line px-1.5 py-0.5 tracking-wide uppercase">
              <T k="lesson.koreanScript" />
            </span>
          ) : null}
        </div>

        <h1 className="text-[1.65rem] leading-snug font-medium tracking-tight text-balance">
          {(() => {
            const shown = courseInfo
              ? lessonDisplay(courseInfo, lesson)
              : { text: lesson.menuLabel ?? lesson.label ?? lesson.title };
            return "n" in shown ? <T k="lesson.numbered" vars={{ n: shown.n }} /> : shown.text;
          })()}
        </h1>

        {pair ? (
          <Link
            href={`/${course}/${pair.id}`}
            className="group mt-5 inline-flex items-center gap-2 border border-line px-3.5 py-2 text-[13px] hover:border-line-strong hover:bg-raised"
          >
            <T k={isScript ? "lesson.backToDrill" : "lesson.viewScript"} />
            <span
              aria-hidden
              className="font-mono transition-transform duration-200 ease-out group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>
        ) : null}
      </header>

      {video.length > 0 ? (
        <div className="mb-10 flex flex-col gap-2.5">
          {video.map((v) => (
            <VideoPlayer key={v.src} src={v.src} />
          ))}
        </div>
      ) : null}

      {audio.length > 0 ? (
        <div className="mb-10 flex flex-col gap-2.5">
          {audio.map((a, i) => (
            <AudioPlayer key={a.src} src={a.src} label={audioLabel(audio.length, i, fromFlash)} />
          ))}
        </div>
      ) : null}

      {lesson.blocks.length > 0 ? (
        <LessonBody blocks={lesson.blocks} lessonKey={`${course}/${lesson.id}`} />
      ) : fromFlash ? (
        <p className="text-[13.5px] text-ink-soft">
          <T
            k={audio.length === 1 ? "lesson.trackRecovered" : "lesson.tracksRecovered"}
            count={audio.length}
          />
        </p>
      ) : (
        <p className="border border-dashed border-line px-4 py-6 text-[13.5px] text-ink-soft">
          <T k="lesson.notMigrated" />
        </p>
      )}

      <footer className="mt-20 border-t border-line pt-4">
        <p className="font-mono text-[10.5px] text-ink-faint">
          <T k="lesson.source" />: {lesson.legacyPath} · {lesson.legacyEncoding}
        </p>
      </footer>
    </main>
  );
}

/**
 * Names the players on a lesson.
 *
 * A drill has a single recording and needs no label. A Flash lesson yields one
 * full narration plus the individual sentence clips recovered from the movie's
 * timeline, which are distinct pieces of audio and do need naming.
 */
function audioLabel(count: number, index: number, fromFlash: boolean): string | undefined {
  if (count <= 1) return undefined;
  if (fromFlash) return index === 0 ? "Full lesson" : `Clip ${index}`;
  return index === 0 ? "Listen" : "Repeat";
}
