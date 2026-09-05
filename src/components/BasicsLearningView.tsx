"use client";

import { useState, useEffect } from "react";
import type { Block } from "@/lib/types";
import { speakText, stopSpeech } from "@/lib/speech";

interface BasicsLearningViewProps {
  blocks: Block[];
  pairBlocks?: Block[] | null;
  course: string;
  lessonKey: string;
  isScript: boolean;
  audioTracks?: { src: string; label?: string }[];
}

export function BasicsLearningView({
  blocks,
  pairBlocks = null,
  course,
  lessonKey,
  isScript,
}: BasicsLearningViewProps) {
  const isQa = lessonKey.includes("qa");

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  if (isQa) {
    return <QaTrackView blocks={blocks} pairBlocks={pairBlocks} lessonKey={lessonKey} isScript={isScript} />;
  }

  return <SentenceTrackView blocks={blocks} pairBlocks={pairBlocks} course={course} isScript={isScript} />;
}

// Sub-view for Spoken Q&A track (basics/qa...)
function QaTrackView({
  blocks,
  pairBlocks,
  lessonKey,
  isScript,
}: {
  blocks: Block[];
  pairBlocks?: Block[] | null;
  lessonKey: string;
  isScript: boolean;
}) {
  const allBlocks = [...blocks, ...(pairBlocks || [])];
  const heading = allBlocks.find((b) => b.type === "heading")?.text || "[질문 훈련]";
  const instruction = allBlocks.find((b) => b.type === "instruction")?.text || "다음 질문을 듣고 대답해 보세요.";

  const sentBlock = allBlocks.find((b) => b.type === "sentences") as
    | { type: "sentences"; items: { n: string; text: string }[] }
    | undefined;
  const sentenceItems = sentBlock?.items ?? [];

  const koParas = (
    allBlocks.filter((b) => b.type === "paragraph" && b.lang === "ko") as {
      type: "paragraph";
      text: string;
    }[]
  ).map((p) => p.text.trim());

  const [revealed, setRevealed] = useState(false);
  const [response, setResponse] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-line bg-surface/90 p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="rounded bg-raised px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-soft uppercase tracking-wider border border-line">
            Step 1 · 음성 질문 듣고 3초 즉답 훈련
          </span>
          <span className="font-mono text-[11px] text-ink-faint">{heading}</span>
        </div>
        <h2 className="mt-2 text-[17px] font-semibold tracking-tight text-ink">
          {instruction}
        </h2>
        <p className="mt-1 text-[13px] text-ink-soft leading-relaxed">
          상단의 원어민 질문 음성을 듣고, 머릿속으로 자연스러운 영어 응답을 구성해 보세요.
        </p>
      </div>

      {/* Answer & Script Guidance */}
      {sentenceItems.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-line/60 pb-3">
            <h3 className="text-[14.5px] font-semibold text-ink">
              Step 2 · 💡 질문 대본 및 모범 답변 확인
            </h3>
            <button
              type="button"
              onClick={() => setRevealed((p) => !p)}
              className="rounded-lg border border-line bg-raised px-3 py-1 text-[12px] font-medium text-ink hover:bg-raised/80 transition-colors cursor-pointer"
            >
              {revealed ? "🔒 답안 숨기기" : "👁️ 답안 확인"}
            </button>
          </div>

          {revealed ? (
            <div className="flex flex-col gap-3 animate-in fade-in">
              {sentenceItems.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-1 rounded-xl bg-raised/40 p-3.5 border border-line/60">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-ink-soft">
                      #{item.n || idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => speakText(item.text, { lang: "en" })}
                      className="text-[11.5px] text-ink-soft hover:text-ink cursor-pointer"
                    >
                      🔊 발음 듣기
                    </button>
                  </div>
                  <p className="text-[15px] font-semibold text-ink">{item.text}</p>
                  {koParas[idx] && (
                    <p className="text-[13.5px] text-ink-soft mt-0.5">{koParas[idx]}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div
              onClick={() => setRevealed(true)}
              className="rounded-xl border border-dashed border-line bg-raised/30 p-6 text-center text-[13px] text-ink-faint hover:text-ink cursor-pointer transition-colors"
            >
              질문에 대한 답변을 스스로 생각해 본 후 클릭하여 대본과 예시 답안을 확인하세요.
            </div>
          )}
        </div>
      )}

      {/* Practice Notes */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-col gap-2.5">
        <label className="text-[13px] font-semibold text-ink">
          Step 3 · ✍️ 내 실제 답변 영어 작성 & 스피킹 (Personalize)
        </label>
        <textarea
          rows={4}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="질문을 듣고 떠오른 내 답변을 영어로 적어보세요..."
          className="w-full rounded-xl border border-line bg-raised/20 p-3.5 text-[14px] text-ink placeholder:text-ink-faint focus:border-ink focus:bg-surface focus:outline-none transition-colors"
        />
      </div>
    </div>
  );
}

// Sub-view for Slashed Sentence track (basics/po... & middle/p...)
function SentenceTrackView({
  blocks,
  pairBlocks,
  course,
  isScript,
}: {
  blocks: Block[];
  pairBlocks?: Block[] | null;
  course: string;
  isScript: boolean;
}) {
  // Extract sentences from main and pair
  const mainItems = blocks
    .filter((b) => b.type === "sentences")
    .flatMap((b) => (b as { type: "sentences"; items: { n: string; text: string }[] }).items);

  const pairItems = (pairBlocks || [])
    .filter((b) => b.type === "sentences")
    .flatMap((b) => (b as { type: "sentences"; items: { n: string; text: string }[] }).items);

  const count = Math.max(mainItems.length, pairItems.length);
  const pairs: { n: string; en: string; ko: string }[] = [];

  for (let i = 0; i < count; i++) {
    const m = mainItems[i]?.text ?? "";
    const p = pairItems[i]?.text ?? "";
    const mIsEn = /[a-zA-Z]{3,}/.test(m);
    const en = mIsEn ? m : p;
    const ko = mIsEn ? p : m;
    pairs.push({
      n: mainItems[i]?.n || pairItems[i]?.n || String(i + 1),
      en,
      ko,
    });
  }

  const [studyMode, setStudyMode] = useState<"bilingual" | "englishOnly" | "koreanOnly">("bilingual");
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  function playSentence(text: string, idx: number) {
    stopSpeech();
    setActiveIdx(idx);
    speakText(text.replace(/\s*\/\s*/g, " "), {
      lang: "en",
      rate: 0.95,
      onEnd: () => setActiveIdx(null),
      onError: () => setActiveIdx(null),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/90 p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-[14px]">
              📖
            </span>
            <h2 className="text-[15px] font-bold text-ink">
              {course === "middle" ? "중등 핵심 문장 끊어읽기 훈련" : "기초 문장 구조 & 낭독 훈련"}
            </h2>
          </div>
          <p className="text-[12px] text-ink-soft mt-1">
            슬래시(/) 단위로 호흡을 끊어 읽으며 영어 특유의 리듬과 의미 덩어리를 체득하세요.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center rounded-xl bg-raised/80 p-1 border border-line/70 text-[12px] font-medium">
          <button
            type="button"
            onClick={() => setStudyMode("bilingual")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              studyMode === "bilingual"
                ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Step 1 · 한/영 대조
          </button>
          <button
            type="button"
            onClick={() => setStudyMode("englishOnly")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              studyMode === "englishOnly"
                ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Step 2 · 영어 낭독
          </button>
          <button
            type="button"
            onClick={() => setStudyMode("koreanOnly")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              studyMode === "koreanOnly"
                ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Step 3 · 영작 인출
          </button>
        </div>
      </div>

      {/* 2. Sentence Cards */}
      <div className="flex flex-col gap-3">
        {pairs.map((pair, idx) => {
          const isPlaying = activeIdx === idx;
          const isRev = revealed[idx] === true;

          return (
            <div
              key={idx}
              className={`flex flex-col gap-2 rounded-2xl border p-4.5 transition-all shadow-2xs ${
                isPlaying
                  ? "border-primary bg-primary/[0.03] ring-1 ring-primary/40 shadow-xs"
                  : "border-line bg-surface hover:border-line-strong hover:bg-raised/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-raised font-mono text-[11px] font-bold text-ink">
                  {pair.n}
                </span>

                <button
                  type="button"
                  onClick={() => playSentence(pair.en, idx)}
                  className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11.5px] font-medium transition-all cursor-pointer ${
                    isPlaying
                      ? "border-primary bg-primary text-surface font-semibold shadow-xs"
                      : "border-line bg-surface text-ink-soft hover:bg-raised hover:text-ink"
                  }`}
                >
                  <span>🔊</span>
                  <span>{isPlaying ? "재생 중..." : "발음 듣기"}</span>
                </button>
              </div>

              {/* English Slashed Text */}
              {studyMode === "koreanOnly" && !isRev ? (
                <button
                  type="button"
                  onClick={() => setRevealed((p) => ({ ...p, [idx]: true }))}
                  className="self-start rounded border border-dashed border-line px-3 py-1 text-[12.5px] text-ink-soft hover:border-ink hover:text-ink cursor-pointer"
                >
                  👁️ 영어 원문 확인하기
                </button>
              ) : (
                <p className="text-[16.5px] font-semibold text-ink leading-relaxed tracking-tight">
                  <SlashedRenderer text={pair.en} />
                </p>
              )}

              {/* Korean Slashed Translation */}
              {pair.ko && studyMode !== "englishOnly" && (
                <p className="text-[14px] text-ink-soft border-t border-line/40 pt-2 font-normal leading-relaxed">
                  <SlashedRenderer text={pair.ko} />
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SlashedRenderer({ text }: { text: string }) {
  if (!text.includes("/")) return <span>{text}</span>;
  const parts = text.split("/").map((p) => p.trim()).filter(Boolean);
  return (
    <span>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && (
            <span className="mx-1.5 font-mono text-ink-faint select-none font-normal opacity-60">
              /
            </span>
          )}
        </span>
      ))}
    </span>
  );
}
