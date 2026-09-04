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
import type { Block } from "@/lib/types";

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
  const pairLesson = pair ? getLesson(course, pair.id) : null;
  const courseInfo = getCourse(course);
  const tab = tabForCourse(course);
  const isScript = lesson.variant === "script";

  // Defensive: collapse duplicate audio by src
  const audio = lesson.audio.filter((a, i, all) => all.findIndex((x) => x.src === a.src) === i);
  const video = lesson.video ?? [];
  const fromFlash = lesson.blocks.length === 0 && audio.length > 0;

  // Extract fallback sentences for TTS reading
  const fallbackSentences = extractSentencesForAudio(lesson.blocks, pairLesson?.blocks, isScript, course);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <nav className="mb-8 flex items-center justify-between gap-4 font-mono text-[11.5px]">
        <Link href={`/${course}`} className="link-underline text-ink-soft hover:text-ink font-medium">
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

      <header className="mb-8" style={{ animation: "fadeUp var(--dur-slow) var(--ease) both" }}>
        <div className="mb-3 flex flex-wrap items-center gap-2.5 font-mono text-[11px] tracking-wide text-ink-faint">
          <span className="uppercase font-semibold tracking-wider text-ink-soft">{tab?.label}</span>
          <span aria-hidden>·</span>
          <span className="tabular-nums font-medium">{lesson.id}</span>
          {isScript ? (
            <span className="border border-line px-1.5 py-0.5 tracking-wide uppercase bg-raised rounded-xs">
              <T k="lesson.koreanScript" />
            </span>
          ) : null}
        </div>

        <h1 className="text-[1.8rem] leading-snug font-semibold tracking-tight text-balance text-ink">
          {(() => {
            const shown = courseInfo
              ? lessonDisplay(courseInfo, lesson)
              : { text: lesson.menuLabel ?? lesson.label ?? lesson.title };
            return "n" in shown ? <T k="lesson.numbered" vars={{ n: shown.n }} /> : shown.text;
          })()}
        </h1>

        {pair ? (
          <div className="mt-4 flex items-center gap-3">
            <Link
              href={`/${course}/${pair.id}`}
              className="group inline-flex items-center gap-2 rounded border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink-soft hover:border-line-strong hover:bg-raised hover:text-ink transition-colors"
            >
              <T k={isScript ? "lesson.backToDrill" : "lesson.viewScript"} />
              <span
                aria-hidden
                className="font-mono transition-transform duration-200 ease-out group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>
          </div>
        ) : null}
      </header>

      {video.length > 0 ? (
        <div className="mb-8 flex flex-col gap-2.5">
          {video.map((v) => (
            <VideoPlayer key={v.src} src={v.src} />
          ))}
        </div>
      ) : null}

      {/* Audio Players with native TTS fallback */}
      {audio.length > 0 ? (
        <div className="mb-8 flex flex-col gap-2.5">
          {audio.map((a, i) => (
            <AudioPlayer
              key={a.src}
              src={a.src}
              fallbackSentences={fallbackSentences}
              lang={courseInfo?.contentLang ?? "en"}
              label={audioLabel(audio.length, i, fromFlash)}
            />
          ))}
        </div>
      ) : fallbackSentences.length > 0 ? (
        <div className="mb-8">
          <AudioPlayer
            fallbackSentences={fallbackSentences}
            lang={courseInfo?.contentLang ?? "en"}
            label="전체 듣기 (AI 음성 재생)"
          />
        </div>
      ) : null}

      {/* Educational Body with Aligned Sentences */}
      {lesson.blocks.length > 0 ? (
        <LessonBody
          blocks={lesson.blocks}
          pairBlocks={pairLesson?.blocks ?? null}
          course={course}
          lessonKey={`${course}/${lesson.id}`}
          isScript={isScript}
          contentLang={courseInfo?.contentLang ?? "en"}
          audioTracks={audio}
        />
      ) : fromFlash ? (
        <p className="text-[13.5px] text-ink-soft">
          <T
            k={audio.length === 1 ? "lesson.trackRecovered" : "lesson.tracksRecovered"}
            count={audio.length}
          />
        </p>
      ) : (
        <p className="border border-dashed border-line px-4 py-6 text-[13.5px] text-ink-soft rounded">
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

function audioLabel(count: number, index: number, fromFlash: boolean): string | undefined {
  if (count <= 1) return undefined;
  if (fromFlash) return index === 0 ? "전체 강의 (Full lesson)" : `클립 ${index} (Clip ${index})`;
  return index === 0 ? "본문 듣기 (Listen)" : "따라하기 (Repeat)";
}

function extractSentencesForAudio(
  blocks: Block[],
  pairBlocks: Block[] | null | undefined,
  isScript: boolean,
  course: string,
): string[] {
  // If this is a Korean script page, prefer the English pair blocks for target audio
  const targetBlocks = isScript && pairBlocks && pairBlocks.length > 0 ? pairBlocks : blocks;

  // 1. Sentences block
  const sentBlock = targetBlocks.find((b) => b.type === "sentences") as { type: "sentences"; items: { text: string }[] } | undefined;
  if (sentBlock?.items && sentBlock.items.length > 0) {
    return sentBlock.items.map((it) => it.text.replace(/\s*\/\s*/g, " ").trim()).filter(Boolean);
  }

  // 2. Dialogue / conversation courses (man, woman, student)
  if (["man", "woman", "student"].includes(course)) {
    const paras = targetBlocks.filter((b) => b.type === "paragraph") as { type: "paragraph"; text: string; lang?: string }[];
    const enParas = paras.filter((p) => p.lang === "en" || !p.lang);
    if (enParas.length > 0) {
      return enParas.map((p) => p.text.trim()).filter(Boolean);
    }
  }

  // 3. Reading passage
  if (course === "reading") {
    const inst = targetBlocks.find((b) => b.type === "instruction");
    if (inst?.text) {
      return inst.text
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  // 4. Any paragraphs
  const allParas = targetBlocks.filter((b) => b.type === "paragraph") as { type: "paragraph"; text: string }[];
  if (allParas.length > 0) {
    return allParas.map((p) => p.text.trim()).filter(Boolean);
  }

  return [];
}
