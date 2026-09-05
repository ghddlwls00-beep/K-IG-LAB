"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Block } from "@/lib/types";
import { useLanguage } from "./LanguageProvider";
import { DictationPanel } from "./DictationPanel";
import { speakText } from "@/lib/speech";
import { VoiceSpeakingTester } from "./VoiceSpeakingTester";

interface LdLearningViewProps {
  blocks: Block[];
  pairBlocks?: Block[] | null;
  lessonKey: string;
  isScript: boolean;
  audioTracks?: { src: string; label?: string }[];
  ldEnglishScript?: { n: string; ko: string; en: string }[] | null;
}

export function LdLearningView({
  blocks,
  pairBlocks = null,
  lessonKey,
  isScript,
  ldEnglishScript = null,
}: LdLearningViewProps) {
  const { t } = useLanguage();

  // Extract hints and choices
  const mainBlocks = isScript ? (pairBlocks || []) : blocks;
  const scriptBlocks = isScript ? blocks : (pairBlocks || []);

  const hintsBlock = mainBlocks.find((b) => b.type === "hints") as { type: "hints"; text: string } | undefined;
  const dictationBlock = blocks.find((b) => b.type === "dictation") as { type: "dictation"; rows: number } | undefined;

  // Extract vocabulary / proper noun chips from hints
  const hintWords = hintsBlock
    ? hintsBlock.text
        .split(/[,.]/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0 && !/^\d+$/.test(w))
    : [];

  // Extract Korean sentences for script view as fallback
  const koSentences: string[] = [];
  for (const b of scriptBlocks) {
    if (b.type === "instruction") {
      const txt = b.text.trim();
      if (txt && !txt.includes("한글 대본을") && !txt.includes("받아쓰기를")) {
        koSentences.push(cleanText(txt));
      }
    } else if (b.type === "paragraph") {
      const txt = b.text.trim();
      if (txt) koSentences.push(cleanText(txt));
    } else if (b.type === "sentences") {
      for (const it of (b as { type: "sentences"; items: { n: string; text: string }[] }).items) {
        const txt = it.text.trim();
        if (txt) koSentences.push(cleanText(txt));
      }
    }
  }

  // Model script sentences (paired Korean and English)
  const sentences: { n: string; ko: string; en: string }[] =
    ldEnglishScript && ldEnglishScript.length > 0
      ? ldEnglishScript
      : koSentences.map((ko, idx) => ({
          n: String(idx + 1),
          ko,
          en: "",
        }));

  // Reference sentences for dictation answer verification
  const referenceSentences = sentences.map((s) => s.en).filter(Boolean);

  // State for Script Learning Mode
  const [drillMode, setDrillMode] = useState<"stepByStep" | "fullPassage">("stepByStep");
  const [sentenceAnswers, setSentenceAnswers] = useState<Record<number, string>>({});
  const [completedSentences, setCompletedSentences] = useState<Record<number, boolean>>({});
  const [revealedEn, setRevealedEn] = useState<Record<number, boolean>>({});
  const [showAllEn, setShowAllEn] = useState(false);
  const [fullEssay, setFullEssay] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const storageKey = `kig:ld:trainer:${lessonKey}`;

  // Restore saved student work from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.sentenceAnswers) setSentenceAnswers(data.sentenceAnswers);
        if (data.completedSentences) setCompletedSentences(data.completedSentences);
        if (data.fullEssay) setFullEssay(data.fullEssay);
        if (data.at) setSavedAt(data.at);
      }
    } catch {
      // ignore
    }
    setRestored(true);
  }, [storageKey]);

  // Persist student work to localStorage
  useEffect(() => {
    if (!restored) return;
    const timer = setTimeout(() => {
      try {
        const at = new Date().toLocaleTimeString();
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ sentenceAnswers, completedSentences, fullEssay, at })
        );
        setSavedAt(at);
      } catch {
        // storage quota or unavailable
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [sentenceAnswers, completedSentences, fullEssay, storageKey, restored]);

  function handleSentenceChange(idx: number, val: string) {
    setSentenceAnswers((prev) => ({ ...prev, [idx]: val }));
  }

  function toggleComplete(idx: number) {
    setCompletedSentences((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  function toggleRevealEn(idx: number) {
    setRevealedEn((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  function toggleAllEn() {
    const next = !showAllEn;
    setShowAllEn(next);
    const updated: Record<number, boolean> = {};
    for (let i = 0; i < sentences.length; i++) {
      updated[i] = next;
    }
    setRevealedEn(updated);
  }

  function speakKorean(text: string) {
    speakText(text, { lang: "ko", rate: 0.95 });
  }

  function speakEnglish(text: string) {
    speakText(text, { lang: "en", rate: 0.95 });
  }

  function speakHint(word: string) {
    speakText(word, { lang: "en", rate: 0.9 });
  }

  function handleCopyFullEssay() {
    if (!fullEssay) return;
    navigator.clipboard.writeText(fullEssay).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const completedCount = Object.values(completedSentences).filter(Boolean).length;
  const totalSentences = sentences.length > 0 ? sentences.length : koSentences.length;
  const progressPercent = totalSentences > 0 ? Math.round((completedCount / totalSentences) * 100) : 0;

  // ---------------------------------------------------------------------------
  // 1. SCRIPT VIEW: 한글 대본 기반 말하기(Speaking) & 역영작(Back-Translation) 훈련
  // ---------------------------------------------------------------------------
  if (isScript) {
    return (
      <div className="flex flex-col gap-8">
        {/* Header Hero Banner */}
        <div className="rounded-xl border border-line bg-surface/80 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-raised px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-soft uppercase tracking-wider border border-line">
                  Step 2 · 말하기 & 역영작 훈련
                </span>
                {savedAt ? (
                  <span className="font-mono text-[11px] text-ink-faint">
                    자동 저장됨 ({savedAt})
                  </span>
                ) : null}
              </div>
              <h2 className="mt-2 text-[17px] font-semibold tracking-tight text-ink">
                한글 대본을 보면서 영어로 말하고 영작해 보세요.
              </h2>
              <p className="mt-1 text-[13px] text-ink-soft leading-relaxed">
                들었던 영어 음성을 떠올리며 각 문장을 소리 내어 말해보거나 직접 영어로 작문해 보세요. [💡 모범 영문 확인] 버튼으로 즉시 스크립트를 대조하고 발음을 청취할 수 있습니다.
              </p>
            </div>

            {/* Mode Switcher Tabs & All Reveal Button */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg border border-line bg-raised/50 p-1 text-[12px] font-medium">
                <button
                  type="button"
                  onClick={() => setDrillMode("stepByStep")}
                  className={
                    "rounded-md px-3 py-1.5 transition-all cursor-pointer " +
                    (drillMode === "stepByStep"
                      ? "bg-ink text-surface font-semibold shadow-xs"
                      : "text-ink-soft hover:text-ink")
                  }
                >
                  🗣️ 문장별 집중 훈련
                </button>
                <button
                  type="button"
                  onClick={() => setDrillMode("fullPassage")}
                  className={
                    "rounded-md px-3 py-1.5 transition-all cursor-pointer " +
                    (drillMode === "fullPassage"
                      ? "bg-ink text-surface font-semibold shadow-xs"
                      : "text-ink-soft hover:text-ink")
                  }
                >
                  📝 전체 지문 일괄 영작
                </button>
              </div>

              {sentences.some((s) => s.en) ? (
                <button
                  type="button"
                  onClick={toggleAllEn}
                  className="rounded-lg border border-line bg-raised/80 px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-surface transition-colors cursor-pointer shadow-2xs"
                >
                  {showAllEn ? "모범 영문 전체 숨기기" : "💡 모범 영문 전체 확인"}
                </button>
              ) : null}
            </div>
          </div>

          {/* Progress Bar */}
          {totalSentences > 0 ? (
            <div className="mt-5 border-t border-line/70 pt-4">
              <div className="mb-1.5 flex items-center justify-between text-[11.5px] font-mono text-ink-soft">
                <span>영작/말하기 달성도</span>
                <span>
                  {completedCount} / {totalSentences} 문장 ({progressPercent}%)
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
                <div
                  className="h-full bg-ink transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Vocabulary Reference Chips from Test Hints */}
        {hintWords.length > 0 ? (
          <div className="rounded-lg border border-line bg-raised/30 p-4 shadow-2xs">
            <div className="mb-2.5 flex items-center justify-between text-[11.5px] font-mono text-ink-faint">
              <span className="font-semibold uppercase tracking-wider">
                💡 영작 참고 핵심 어휘 & 고유명사 (클릭 시 발음 청취)
              </span>
              <span>{hintWords.length}개 단어</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {hintWords.map((word, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => speakHint(word)}
                  title="클릭하여 영어 발음 청취"
                  className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-[12.5px] font-medium text-ink hover:border-ink/50 hover:bg-raised transition-colors cursor-pointer shadow-2xs"
                >
                  <span>{word}</span>
                  <span className="text-[11px] text-ink-faint">🔊</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* 1) STEP-BY-STEP DRILL MODE */}
        {drillMode === "stepByStep" ? (
          <div className="flex flex-col gap-4">
            {sentences.map((item, idx) => {
              const isDone = Boolean(completedSentences[idx]);
              const isRevealed = Boolean(showAllEn || revealedEn[idx]);
              const userAns = sentenceAnswers[idx] || "";

              return (
                <div
                  key={idx}
                  className={
                    "rounded-xl border p-4.5 transition-all duration-150 shadow-2xs " +
                    (isDone
                      ? "border-line bg-surface/40 opacity-90"
                      : "border-line bg-surface hover:border-line-strong")
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised font-mono text-[11px] font-bold text-ink-soft border border-line/60">
                        {item.n || idx + 1}
                      </span>
                      <p className="text-[15px] font-medium text-ink leading-relaxed text-balance">
                        {item.ko}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => speakKorean(item.ko)}
                        title="한글 음성 듣기"
                        className="rounded p-1.5 text-ink-faint hover:bg-raised hover:text-ink transition-colors cursor-pointer"
                      >
                        🔊
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleComplete(idx)}
                        className={
                          "flex items-center gap-1 rounded px-2.5 py-1 text-[11.5px] font-medium transition-colors cursor-pointer " +
                          (isDone
                            ? "bg-ink text-surface font-semibold"
                            : "border border-line bg-surface text-ink-soft hover:bg-raised hover:text-ink")
                        }
                      >
                        <span>{isDone ? "✓ 완료됨" : "완료 체크"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Typing input & Answer Toggle */}
                  <div className="mt-3.5 pl-9 flex flex-col gap-2.5">
                    <div className="flex flex-wrap sm:flex-nowrap gap-2">
                      <input
                        type="text"
                        value={userAns}
                        onChange={(e) => handleSentenceChange(idx, e.target.value)}
                        placeholder="영어로 말해보거나 직접 영작해 보세요... (자동 저장)"
                        className="flex-1 rounded-lg border border-line/80 bg-raised/30 px-3.5 py-2 font-mono text-[13.5px] text-ink placeholder:text-ink-faint focus:border-ink focus:bg-surface focus:outline-none transition-colors"
                      />
                      {item.en ? (
                        <button
                          type="button"
                          onClick={() => toggleRevealEn(idx)}
                          className={
                            "shrink-0 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 " +
                            (isRevealed
                              ? "border border-emerald-600/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                              : "border border-line bg-raised text-ink-soft hover:text-ink hover:bg-surface")
                          }
                        >
                          <span>{isRevealed ? "💡 스크립트 닫기" : "💡 모범 영문 확인"}</span>
                        </button>
                      ) : null}
                    </div>

                    {/* 🎙️ 음성 딕테이션 & 발음 테스트 */}
                    {item.en ? (
                      <div>
                        <VoiceSpeakingTester
                          targetText={item.en}
                          buttonLabel="🎙️ 말해서 딕테이션 & 발음 채점"
                          onSuccess={(transcript, score) => {
                            handleSentenceChange(idx, transcript);
                            if (score >= 75) {
                              setCompletedSentences((prev) => ({ ...prev, [idx]: true }));
                            }
                          }}
                        />
                      </div>
                    ) : null}

                    {/* Revealed English Model Transcript Card */}
                    {isRevealed && item.en ? (
                      <div className="mt-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-[13.5px] leading-relaxed text-emerald-950 dark:text-emerald-200">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                            ✨ 모범 영문 스크립트 (Model English Transcript)
                          </span>
                          <button
                            type="button"
                            onClick={() => speakEnglish(item.en)}
                            title="원어민 표준 발음 듣기"
                            className="inline-flex items-center gap-1 rounded bg-emerald-600/20 px-2 py-0.5 text-[11px] font-medium text-emerald-900 dark:text-emerald-200 hover:bg-emerald-600/30 transition-colors cursor-pointer"
                          >
                            <span>🔊 원어민 발음</span>
                          </button>
                        </div>
                        <p className="font-mono font-medium select-text">{item.en}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* 2) FULL PASSAGE COMPOSITION MODE */
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left Column: Full Korean Reference Text with English Comparison */}
            <div className="rounded-xl border border-line bg-surface p-5 shadow-xs flex flex-col">
              <div className="mb-3.5 flex items-center justify-between border-b border-line/70 pb-2.5">
                <span className="font-mono text-[11px] font-semibold uppercase text-ink-faint tracking-wider">
                  지문 대본 대조 (Passage Reference)
                </span>
                <span className="text-[11px] text-ink-faint">총 {sentences.length}개 문장</span>
              </div>
              <div className="flex flex-col gap-3.5 max-h-[600px] overflow-y-auto pr-1">
                {sentences.map((s, i) => (
                  <div key={i} className="border-b border-line/40 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[14px] leading-relaxed text-ink/90">
                        <span className="mr-2 font-mono text-[11px] font-bold text-ink-faint">
                          {s.n || i + 1}.
                        </span>
                        {s.ko}
                      </p>
                      <button
                        type="button"
                        onClick={() => speakKorean(s.ko)}
                        title="한글 음성 듣기"
                        className="shrink-0 text-[11px] text-ink-faint hover:text-ink cursor-pointer p-1"
                      >
                        🔊
                      </button>
                    </div>
                    {s.en ? (
                      <div className="mt-2 rounded bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-emerald-950 dark:text-emerald-200">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-mono text-[13px] leading-relaxed select-text">
                            {s.en}
                          </p>
                          <button
                            type="button"
                            onClick={() => speakEnglish(s.en)}
                            title="영문 표준 발음 듣기"
                            className="shrink-0 text-[11px] text-emerald-800 dark:text-emerald-300 hover:text-emerald-900 cursor-pointer p-0.5"
                          >
                            🔊
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Full Composition Textarea */}
            <div className="flex flex-col rounded-xl border border-line bg-surface p-5 shadow-xs">
              <div className="mb-3.5 flex items-center justify-between border-b border-line/70 pb-2.5">
                <span className="font-mono text-[11px] font-semibold uppercase text-ink-faint tracking-wider">
                  내 영작 연습장 (Full Composition)
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-ink-faint">
                    {fullEssay.trim().split(/\s+/).filter(Boolean).length}단어 / {fullEssay.length}자
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyFullEssay}
                    className="rounded border border-line bg-raised px-2 py-0.5 font-mono text-[11px] text-ink-soft hover:text-ink transition-colors cursor-pointer"
                  >
                    {copied ? "✓ 복사됨" : "전체 복사"}
                  </button>
                </div>
              </div>

              <textarea
                rows={16}
                value={fullEssay}
                onChange={(e) => setFullEssay(e.target.value)}
                placeholder="전체 한글 지문을 읽으며 처음부터 끝까지 쉬지 않고 영어로 번역해 보세요. (실시간 자동 저장)"
                className="w-full flex-1 resize-y rounded-lg border border-line/80 bg-raised/20 p-3.5 font-mono text-[13.5px] leading-relaxed text-ink placeholder:text-ink-faint focus:border-ink focus:bg-surface focus:outline-none transition-colors"
              />
            </div>
          </div>
        )}

        {/* Bottom CTA to Return to Dictation Test */}
        <div className="rounded-xl border border-dashed border-line bg-raised/40 p-5 text-center">
          <p className="text-[13px] text-ink-soft mb-3">
            영작 훈련을 마친 후 실전 오디오를 다시 들으며 받아쓰기 시험을 복습해 보세요.
          </p>
          {pairBlocks ? (
            <Link
              href={`/ld/${(lessonKey.split("/")[1] || "").replace("-1", "")}`}
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-[13px] font-medium text-surface transition-transform hover:scale-[1.02] active:scale-95 shadow-xs"
            >
              <span>← 듣기 & 받아쓰기 시험으로 돌아가기</span>
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. MAIN VIEW: 실전 듣기 & 받아쓰기 시험 (d001, d002, ...)
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-8">
      {/* Test Header Guidance */}
      <div className="rounded-xl border border-line bg-surface/90 p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="rounded bg-raised px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-soft uppercase tracking-wider border border-line">
            Step 1 · 실전 듣기 & 받아쓰기
          </span>
        </div>
        <h2 className="mt-2 text-[17px] font-semibold tracking-tight text-ink">
          다음에 나오는 고유 명사, 숫자, 어려운 단어를 참조하면서 영어로 받아쓰기를 하세요.
        </h2>
        <p className="mt-1 text-[13px] text-ink-soft leading-relaxed">
          상단의 원어민 오디오를 재생하며 실전처럼 받아쓰기를 진행하세요. 작성을 마친 후 [🔍 정답 대조] 버튼으로 원문 스크립트와 대조하고 개별 문장 발음을 청취할 수 있습니다.
        </p>
      </div>

      {/* Hints & Vocabulary Cards */}
      {hintWords.length > 0 ? (
        <div className="rounded-lg border border-line bg-raised/30 p-4 shadow-2xs">
          <div className="mb-2.5 flex items-center justify-between text-[11.5px] font-mono text-ink-faint">
            <span className="font-semibold uppercase tracking-wider">
              📌 시험 전 참조 어휘 및 고유명사 (Vocabulary Hints)
            </span>
            <span>{hintWords.length}개 힌트</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {hintWords.map((word, i) => (
              <button
                key={i}
                type="button"
                onClick={() => speakHint(word)}
                title="클릭하여 영어 발음 청취"
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-[12.5px] font-medium text-ink hover:border-ink/50 hover:bg-raised transition-colors cursor-pointer shadow-2xs"
              >
                <span>{word}</span>
                <span className="text-[11px] text-ink-faint">🔊</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Dictation & Answer Verification Board (No multiple-choice 1~5) */}
      <DictationPanel
        options={null}
        rows={dictationBlock?.rows ?? 10}
        storageKey={lessonKey}
        referenceSentences={referenceSentences}
      />

      {/* Next Step Banner (Link to Step 2 Script) */}
      <div className="rounded-xl border border-line bg-raised/40 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-[14.5px] font-semibold text-ink">
            받아쓰기를 마쳤나요? 한글 대본 및 역영작(Back-Translation) 훈련을 진행하세요.
          </h3>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">
            한글 문장을 보고 영어로 전환해보는 훈련을 통해 원어민의 어순과 표현 방식을 뇌에 완벽히 각인시킵니다.
          </p>
        </div>

        <Link
          href={`/ld/${lessonKey.split("/")[1] || ""}-1`}
          className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-[13px] font-medium text-surface transition-transform hover:scale-[1.02] active:scale-95 shadow-xs shrink-0"
        >
          <span>한글 대본 & 영작 훈련 보기 →</span>
        </Link>
      </div>
    </div>
  );
}

function cleanText(t: string): string {
  return t
    .replace(/^\s*\d+[\.\)]\s*/, "")
    .replace(/\s*\/\s*/g, " ")
    .trim();
}
