"use client";

import { useState } from "react";
import type { Block } from "@/lib/types";

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
  audioTracks = [],
}: BasicsLearningViewProps) {
  const isQa = lessonKey.includes("qa");

  if (isQa) {
    return (
      <QaTrackView
        blocks={blocks}
        pairBlocks={pairBlocks}
        lessonKey={lessonKey}
        isScript={isScript}
        audioTracks={audioTracks}
      />
    );
  }

  return (
    <SentenceTrackView
      blocks={blocks}
      pairBlocks={pairBlocks}
      course={course}
      isScript={isScript}
      audioTracks={audioTracks}
    />
  );
}

// Sub-view for Spoken Q&A track (basics/qa...)
function QaTrackView({
  blocks,
  pairBlocks,
  lessonKey,
  isScript,
  audioTracks = [],
}: {
  blocks: Block[];
  pairBlocks?: Block[] | null;
  lessonKey: string;
  isScript: boolean;
  audioTracks?: { src: string; label?: string }[];
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
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});

  return (
    <div className="flex flex-col gap-6">
      {/* Pedagogical Banner */}
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-bold text-primary uppercase tracking-wider">
            Dogme ELT · Spoken Interaction & Notice the Gap
          </span>
          <span className="font-mono text-[11px] text-ink-faint">{heading}</span>
        </div>
        <h2 className="mt-2 text-[17px] font-bold tracking-tight text-ink">
          {instruction}
        </h2>
        <p className="mt-1 text-[13px] text-ink-soft leading-relaxed">
          원어민 질문 음성을 듣고 즉각적인 구두 응답을 구성한 후, 모범 답변과의 구문적 격차(Notice the Gap)를 자가 점검하세요.
        </p>
      </div>

      {/* Answer & Script Guidance */}
      {sentenceItems.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-line/60 pb-3">
            <div>
              <h3 className="text-[15px] font-bold text-ink">
                Step 2 · 💡 질문 대본 및 모범 답변 확인
              </h3>
              <p className="text-[12px] text-ink-soft mt-0.5">
                질문에 대한 원어민 대본을 확인하고 자신만의 답변을 직접 영작해 보세요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRevealed((p) => !p)}
              className="rounded-lg border border-line bg-raised px-3.5 py-1.5 text-[12px] font-medium text-ink hover:bg-raised/80 transition-colors cursor-pointer"
            >
              {revealed ? "🔒 답안 숨기기" : "👁️ 답안 확인"}
            </button>
          </div>

          {revealed ? (
            <div className="flex flex-col gap-4 animate-in fade-in">
              {sentenceItems.map((item, idx) => {
                const targetText = item.text;
                const userVal = userAnswers[idx] || "";

                return (
                  <div key={idx} className="flex flex-col gap-3 rounded-xl bg-raised/40 p-4 border border-line/60">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[12px] font-bold text-primary">
                        Question #{item.n || idx + 1}
                      </span>
                    </div>
                    <p className="text-[16px] font-bold text-ink leading-relaxed">{item.text}</p>
                    {koParas[idx] && (
                      <p className="text-[14px] text-ink-soft">{koParas[idx]}</p>
                    )}

                    {/* Interactive Production & Notice the Gap */}
                    <div className="mt-2 pt-3 border-t border-line/40 flex flex-col gap-2">
                      <label className="text-[12.5px] font-semibold text-ink-soft">
                        ✍️ 내 답변 영작 (Scott Thornbury 'Notice the Gap' 대조):
                      </label>
                      <input
                        type="text"
                        value={userVal}
                        onChange={(e) =>
                          setUserAnswers((prev) => ({ ...prev, [idx]: e.target.value }))
                        }
                        placeholder="이 질문에 대한 나만의 영어 답변을 입력해 보세요..."
                        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none transition-colors"
                      />
                      {userVal.trim().length > 0 && (
                        <div className="rounded-xl border border-line/80 bg-surface/90 p-3 mt-1">
                          <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-ink-soft mb-1">
                            <span>핵심 어휘 일치 대조 (Gap Analysis)</span>
                            <span className="text-emerald-700">녹색: 모범 구문 일치</span>
                          </div>
                          {renderDiffTokens(userVal, targetText)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              onClick={() => setRevealed(true)}
              className="rounded-xl border border-dashed border-line bg-raised/30 p-8 text-center text-[13.5px] text-ink-soft hover:text-ink hover:border-line-strong cursor-pointer transition-colors"
            >
              상단 오디오의 질문을 듣고 머릿속으로 답변을 생각한 후 클릭하여 모범 대본과 자가 대조를 시작하세요.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function extractSentenceList(blocks: Block[]): { n: string; text: string }[] {
  const sentItems = blocks
    .filter((b) => b.type === "sentences")
    .flatMap((b) => (b as { type: "sentences"; items: { n: string; text: string }[] }).items)
    .filter((item) => item.text.trim().length > 0);
  if (sentItems.length > 0) return sentItems;

  const result: { n: string; text: string }[] = [];
  let idx = 1;
  for (const b of blocks) {
    if (b.type === "instruction" || b.type === "hints") {
      const txt = b.text.trim();
      if (!txt) continue;
      if (
        txt.startsWith("[") ||
        txt.includes("K-IG") ||
        /^\d+과\s*/.test(txt) ||
        /^principle\s*\d+/i.test(txt) ||
        txt.includes("듣기훈련") ||
        txt.includes("받아쓰기") ||
        txt.includes("대본을")
      ) {
        continue;
      }
      result.push({
        n: String(idx++),
        text: txt,
      });
    }
  }
  return result;
}

// Sub-view for Slashed Sentence track (basics/po... & middle/p...)
function SentenceTrackView({
  blocks,
  pairBlocks,
  course,
  isScript,
  audioTracks = [],
}: {
  blocks: Block[];
  pairBlocks?: Block[] | null;
  course: string;
  isScript: boolean;
  audioTracks?: { src: string; label?: string }[];
}) {
  const mainItems = extractSentenceList(blocks);
  const pairItems = extractSentenceList(pairBlocks || []);

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

  const [studyMode, setStudyMode] = useState<"bilingual" | "chunks" | "recall">("bilingual");
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [recallInputs, setRecallInputs] = useState<Record<number, string>>({});

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/90 p-4.5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-[14px]">
              📖
            </span>
            <h2 className="text-[16px] font-bold text-ink">
              {course === "middle" ? "중등 핵심 통사 구문 끊어읽기 훈련" : "기초 문장 구조 & 청크 낭독 훈련"}
            </h2>
          </div>
          <p className="text-[12px] text-ink-soft mt-1">
            Stephen Krashen의 의미 덩어리(Thought Groups) 슬래시(/)를 기준으로 끊어 읽고, Paul Nation의 인출 기법으로 체화하세요.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center rounded-xl bg-raised/80 p-1 border border-line/70 text-[12px] font-medium">
          <button
            type="button"
            onClick={() => setStudyMode("bilingual")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              studyMode === "bilingual"
                ? "bg-surface text-ink font-bold shadow-2xs border border-line/80"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Step 1 · 한/영 대조
          </button>
          <button
            type="button"
            onClick={() => setStudyMode("chunks")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              studyMode === "chunks"
                ? "bg-surface text-ink font-bold shadow-2xs border border-line/80"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Step 2 · 슬래시 낭독
          </button>
          <button
            type="button"
            onClick={() => setStudyMode("recall")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              studyMode === "recall"
                ? "bg-surface text-ink font-bold shadow-2xs border border-line/80"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Step 3 · 블라인드 역영작
          </button>
        </div>
      </div>

      {/* Sentence Cards */}
      <div className="flex flex-col gap-3">
        {pairs.map((pair, idx) => {
          const isRev = revealed[idx] === true;
          const userVal = recallInputs[idx] || "";
          const cleanEn = pair.en.replace(/\s*\/\s*/g, " ");

          return (
            <div
              key={idx}
              className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 transition-all shadow-2xs hover:border-line-strong"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-raised font-mono text-[11px] font-bold text-ink">
                  {pair.n}
                </span>
                <span className="font-mono text-[11.5px] text-ink-faint">
                  Thought Group #{pair.n}
                </span>
              </div>

              {/* Mode-specific content */}
              {studyMode === "recall" ? (
                <div className="flex flex-col gap-3">
                  {pair.ko && (
                    <p className="text-[16px] font-bold text-ink leading-relaxed">
                      {pair.ko.replace(/\s*\/\s*/g, " ")}
                    </p>
                  )}
                  <input
                    type="text"
                    value={userVal}
                    onChange={(e) =>
                      setRecallInputs((p) => ({ ...p, [idx]: e.target.value }))
                    }
                    placeholder="영어 문장으로 역영작해 보세요..."
                    className="w-full rounded-xl border border-line bg-raised/30 px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-faint focus:border-ink focus:bg-surface focus:outline-none transition-colors"
                  />

                  {userVal.trim().length > 0 && (
                    <div className="rounded-xl border border-line/80 bg-surface/90 p-3 mt-1">
                      <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-ink-soft mb-1">
                        <span>Notice the Gap (모범 문장 대조)</span>
                        <span className="text-emerald-700">일치 단어 강조</span>
                      </div>
                      {renderDiffTokens(userVal, cleanEn)}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-line/40">
                    <button
                      type="button"
                      onClick={() => setRevealed((p) => ({ ...p, [idx]: !isRev }))}
                      className="rounded-lg border border-line bg-raised/60 px-3 py-1 text-[12px] font-medium text-ink hover:bg-raised transition-colors cursor-pointer"
                    >
                      {isRev ? "🔒 모범 영문 가리기" : "💡 모범 영문 확인"}
                    </button>
                  </div>

                  {isRev && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-3.5 animate-in fade-in">
                      <span className="font-mono text-[11px] font-bold text-emerald-700 uppercase">
                        모범 영어 원문
                      </span>
                      <p className="mt-1 text-[15.5px] font-semibold text-emerald-950 leading-relaxed">
                        <SlashedRenderer text={pair.en} />
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-[17px] font-bold text-ink leading-relaxed tracking-tight">
                    <SlashedRenderer text={pair.en} />
                  </p>

                  {studyMode === "bilingual" && pair.ko && (
                    <p className="text-[14.5px] text-ink-soft border-t border-line/40 pt-2 font-normal leading-relaxed">
                      <SlashedRenderer text={pair.ko} />
                    </p>
                  )}
                </div>
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
            <span className="mx-1.5 font-mono text-primary select-none font-semibold opacity-70">
              /
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

function renderDiffTokens(userText: string, targetText: string) {
  const cleanTarget = targetText.replace(/[.,!?;:"'—–-]/g, "").toLowerCase().split(/\s+/).filter(Boolean);
  const userWords = userText.trim().split(/\s+/).filter(Boolean);

  if (userWords.length === 0) {
    return <span className="text-ink-faint text-[12px]">입력된 문장이 없습니다.</span>;
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {userWords.map((word, i) => {
        const cleanWord = word.replace(/[.,!?;:"'—–-]/g, "").toLowerCase();
        const isMatched = cleanTarget.includes(cleanWord);
        return (
          <span
            key={i}
            className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[12px] font-semibold border ${
              isMatched
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                : "border-amber-500/40 bg-amber-500/10 text-amber-800"
            }`}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}
