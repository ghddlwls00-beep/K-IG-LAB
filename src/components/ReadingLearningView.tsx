"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Block } from "@/lib/types";
import { speakText } from "@/lib/speech";

interface ReadingLearningViewProps {
  blocks: Block[];
  pairBlocks?: Block[] | null;
  lessonKey: string;
  isScript: boolean;
  audioTracks?: { src: string; label?: string }[];
}

export function ReadingLearningView({
  blocks,
  pairBlocks = null,
  lessonKey,
  isScript,
}: ReadingLearningViewProps) {
  // Extract passages from main and pair blocks
  const mainInstruction = blocks.find((b) => b.type === "instruction")?.text ?? "";
  const pairInstruction = pairBlocks?.find((b) => b.type === "instruction")?.text ?? "";


  // Determine English vs Korean passage
  const mainIsEn = isEnglish(mainInstruction);
  const enPassage = mainIsEn ? mainInstruction : pairInstruction;
  const koPassage = mainIsEn ? pairInstruction : mainInstruction;

  // Aligned sentence pairs for dual & breakdown modes
  const sentencePairs = useMemo(() => {
    const enSents = splitSentences(enPassage);
    const koSents = splitSentences(koPassage);
    return alignSentences(enSents, koSents);
  }, [enPassage, koPassage]);

  // View settings
  const [readingMode, setReadingMode] = useState<"flow" | "dual" | "breakdown">("flow");
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("normal");
  const [showNumbers, setShowNumbers] = useState(true);

  // Active highlighted sentence (synchronized between English and Korean)
  const [activeSentence, setActiveSentence] = useState<number | null>(null);
  const [revealedTranslations, setRevealedTranslations] = useState<Record<number, boolean>>({});

  // Reading Notes & Summary saved to localStorage
  const [notes, setNotes] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [restored, setRestored] = useState(false);

  const storageKey = `kig:reading:notes:${lessonKey}`;

  // Restore notes
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.notes) setNotes(data.notes);
        if (data.at) setSavedAt(data.at);
      }
    } catch {
      // ignore
    }
    setRestored(true);
  }, [storageKey]);

  // Auto-save notes
  useEffect(() => {
    if (!restored) return;
    const timer = setTimeout(() => {
      try {
        const at = new Date().toLocaleTimeString();
        window.localStorage.setItem(storageKey, JSON.stringify({ notes, at }));
        setSavedAt(at);
      } catch {
        // ignore
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [notes, storageKey, restored]);

  function playSentenceEn(text: string, idx: number) {
    if (!text) return;
    setActiveSentence(idx);
    speakText(text, {
      lang: "en",
      rate: 0.95,
      onEnd: () => setActiveSentence(null),
      onError: () => setActiveSentence(null),
    });
  }

  function playSentenceKo(text: string) {
    if (!text) return;
    speakText(text, { lang: "ko", rate: 0.95 });
  }

  function toggleRevealTranslation(idx: number) {
    setRevealedTranslations((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  function handleCopyPassage(txt: string) {
    if (!txt) return;
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const fontClasses = {
    normal: "text-[15.5px] leading-[1.85]",
    large: "text-[17px] leading-[1.95]",
    xlarge: "text-[19px] leading-[2.1]",
  }[fontSize];

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Header Toolbar & Study Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface/80 p-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5 text-[12px] font-medium text-ink-soft">
          <span className="font-mono text-[11px] text-ink-faint uppercase font-semibold mr-1">
            독해 뷰어:
          </span>

          <button
            type="button"
            onClick={() => setReadingMode("flow")}
            className={
              "rounded-md px-3 py-1.5 transition-all cursor-pointer " +
              (readingMode === "flow"
                ? "bg-ink text-surface font-semibold shadow-xs"
                : "text-ink-soft hover:bg-raised hover:text-ink")
            }
          >
            Step 1 · 📖 원어민 호흡 속독 (Flow)
          </button>

          <button
            type="button"
            onClick={() => setReadingMode("dual")}
            className={
              "rounded-md px-3 py-1.5 transition-all cursor-pointer " +
              (readingMode === "dual"
                ? "bg-ink text-surface font-semibold shadow-xs"
                : "text-ink-soft hover:bg-raised hover:text-ink")
            }
          >
            Step 2 · ⚖️ 좌우 구문 대조 (Dual)
          </button>

          <button
            type="button"
            onClick={() => setReadingMode("breakdown")}
            className={
              "rounded-md px-3 py-1.5 transition-all cursor-pointer " +
              (readingMode === "breakdown"
                ? "bg-ink text-surface font-semibold shadow-xs"
                : "text-ink-soft hover:bg-raised hover:text-ink")
            }
          >
            Step 3 · 🔬 문장별 정밀 분석 (Breakdown)
          </button>
        </div>

        {/* View Options (Font Size & Number Toggle) */}
        <div className="flex items-center gap-2">
          {/* Sentence number toggle */}
          <button
            type="button"
            onClick={() => setShowNumbers((prev) => !prev)}
            title="문장 번호 표시 On/Off"
            className={
              "rounded border px-2 py-1 font-mono text-[11px] transition-colors cursor-pointer " +
              (showNumbers
                ? "border-ink/50 bg-raised font-semibold text-ink"
                : "border-line bg-surface text-ink-faint hover:text-ink")
            }
          >
            # 번호 {showNumbers ? "ON" : "OFF"}
          </button>

          {/* Font Size controls */}
          <div className="flex items-center rounded border border-line bg-surface text-[11px] font-mono text-ink-soft">
            <button
              type="button"
              onClick={() => setFontSize("normal")}
              className={`px-2 py-1 transition-colors ${fontSize === "normal" ? "bg-raised font-bold text-ink" : "hover:text-ink"}`}
            >
              보통
            </button>
            <button
              type="button"
              onClick={() => setFontSize("large")}
              className={`border-x border-line px-2 py-1 transition-colors ${fontSize === "large" ? "bg-raised font-bold text-ink" : "hover:text-ink"}`}
            >
              크게
            </button>
            <button
              type="button"
              onClick={() => setFontSize("xlarge")}
              className={`px-2 py-1 transition-colors ${fontSize === "xlarge" ? "bg-raised font-bold text-ink" : "hover:text-ink"}`}
            >
              특대
            </button>
          </div>
        </div>
      </div>

      {/* 2. MODE 1: FLOW READING (실전 지문 통독 뷰어) */}
      {readingMode === "flow" ? (
        <section aria-label="Flow Reading Passage" className="flex flex-col gap-4">
          <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-xs">
            <div className="mb-4 flex items-center justify-between border-b border-line/70 pb-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-raised px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-soft uppercase tracking-wider border border-line">
                  {isScript ? "한글 해설 전문" : "English Passage"}
                </span>
                <span className="text-[12px] text-ink-faint">
                  총 {sentencePairs.length}개 문장 · 문장을 누르면 직독직해 해석과 음성이 표시됩니다
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleCopyPassage(isScript ? koPassage : enPassage)}
                className="rounded border border-line bg-raised px-2.5 py-1 font-mono text-[11px] text-ink-soft hover:text-ink transition-colors cursor-pointer"
              >
                {copied ? "✓ 복사 완료" : "지문 전체 복사"}
              </button>
            </div>

            {/* Seamless Natural Paragraph Layout */}
            <div className={`${fontClasses} font-serif tracking-normal text-ink text-justify`}>
              {sentencePairs.map((pair, idx) => {
                const isActive = activeSentence === idx;
                const displayText = isScript ? pair.ko : pair.en;

                return (
                  <span
                    key={idx}
                    onClick={() => setActiveSentence(isActive ? null : idx)}
                    onMouseEnter={() => setActiveSentence(idx)}
                    className={
                      "group inline cursor-pointer rounded px-1 py-0.5 transition-all duration-150 " +
                      (isActive
                        ? "bg-ink/10 text-ink ring-1 ring-ink/30 font-medium"
                        : "hover:bg-raised/70")
                    }
                  >
                    {showNumbers ? (
                      <sup className="mr-1 select-none font-mono text-[10px] font-semibold text-ink-faint group-hover:text-ink">
                        [{idx + 1}]
                      </sup>
                    ) : null}
                    <span>{displayText}</span>{" "}
                  </span>
                );
              })}
            </div>

            {/* Interactive Sentence Drawer / Instant Translation Bar */}
            {activeSentence !== null && sentencePairs[activeSentence] ? (
              <div className="mt-6 rounded-xl border border-line-strong bg-raised/50 p-4 shadow-sm transition-all duration-200 animate-in fade-in">
                <div className="flex items-center justify-between gap-3 border-b border-line/60 pb-2.5">
                  <div className="flex items-center gap-2 font-mono text-[11.5px] text-ink-faint">
                    <span className="rounded bg-ink px-1.5 py-0.5 text-surface font-bold">
                      문장 #{activeSentence + 1}
                    </span>
                    <span>직독직해 분석</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => playSentenceEn(sentencePairs[activeSentence].en, activeSentence)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink hover:bg-raised transition-colors cursor-pointer"
                    >
                      <span>🔊 원문 듣기</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => playSentenceKo(sentencePairs[activeSentence].ko)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink hover:bg-raised transition-colors cursor-pointer"
                    >
                      <span>🔊 해석 듣기</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSentence(null)}
                      className="rounded p-1 text-ink-faint hover:text-ink"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  <div className="text-[14.5px] text-ink font-serif leading-relaxed">
                    <span className="font-mono text-[11px] font-bold text-ink-faint mr-2 uppercase">EN:</span>
                    {sentencePairs[activeSentence].en}
                  </div>
                  <div className="text-[14.5px] text-ink-soft leading-relaxed border-t border-line/40 pt-2">
                    <span className="font-mono text-[11px] font-bold text-ink-faint mr-2 uppercase">KO:</span>
                    {sentencePairs[activeSentence].ko}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* 3. MODE 2: SIDE-BY-SIDE DUAL READER (좌우 나란히 비교 대조 뷰어) */}
      {readingMode === "dual" ? (
        <section aria-label="Side-by-Side Dual Reading" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column: English Passage */}
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
            <div className="mb-4 flex items-center justify-between border-b border-line/70 pb-2.5">
              <span className="rounded bg-raised px-2 py-0.5 font-mono text-[11px] font-semibold text-ink uppercase tracking-wider border border-line">
                English Passage (영어 원문)
              </span>
              <span className="font-mono text-[11px] text-ink-faint">마우스 호버 시 동기화</span>
            </div>

            <div className={`${fontClasses} font-serif text-ink leading-loose text-justify`}>
              {sentencePairs.map((pair, idx) => {
                const isActive = activeSentence === idx;
                return (
                  <span
                    key={idx}
                    onMouseEnter={() => setActiveSentence(idx)}
                    onClick={() => playSentenceEn(pair.en, idx)}
                    className={
                      "inline cursor-pointer rounded px-1 py-0.5 transition-all duration-150 " +
                      (isActive
                        ? "bg-ink text-surface font-semibold shadow-xs ring-2 ring-ink/20"
                        : "hover:bg-raised")
                    }
                  >
                    {showNumbers ? (
                      <sup className="mr-1 select-none font-mono text-[10px] opacity-75 font-bold">
                        [{idx + 1}]
                      </sup>
                    ) : null}
                    <span>{pair.en}</span>{" "}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Right Column: Korean Passage */}
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
            <div className="mb-4 flex items-center justify-between border-b border-line/70 pb-2.5">
              <span className="rounded bg-raised px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-soft uppercase tracking-wider border border-line">
                Korean Interpretation (한글 완역)
              </span>
              <span className="font-mono text-[11px] text-ink-faint">1:1 구문 대조</span>
            </div>

            <div className={`${fontClasses} text-ink/90 leading-loose text-justify`}>
              {sentencePairs.map((pair, idx) => {
                const isActive = activeSentence === idx;
                return (
                  <span
                    key={idx}
                    onMouseEnter={() => setActiveSentence(idx)}
                    onClick={() => playSentenceKo(pair.ko)}
                    className={
                      "inline cursor-pointer rounded px-1 py-0.5 transition-all duration-150 " +
                      (isActive
                        ? "bg-ink text-surface font-semibold shadow-xs ring-2 ring-ink/20"
                        : "hover:bg-raised")
                    }
                  >
                    {showNumbers ? (
                      <sup className="mr-1 select-none font-mono text-[10px] opacity-75 font-bold">
                        [{idx + 1}]
                      </sup>
                    ) : null}
                    <span>{pair.ko}</span>{" "}
                  </span>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* 4. MODE 3: SENTENCE BREAKDOWN DRILL (문장별 정밀 구문 분석) */}
      {readingMode === "breakdown" ? (
        <section aria-label="Sentence Breakdown Drill" className="flex flex-col gap-4">
          {sentencePairs.map((pair, idx) => {
            const isRevealed = Boolean(revealedTranslations[idx]);
            const isPlaying = activeSentence === idx;

            return (
              <div
                key={idx}
                className={
                  "rounded-xl border p-5 transition-all duration-150 shadow-2xs " +
                  (isPlaying
                    ? "border-ink bg-raised/40 ring-1 ring-ink/20"
                    : "border-line bg-surface hover:border-line-strong")
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-[11px] font-bold text-surface">
                      {idx + 1}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                      Sentence #{idx + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => playSentenceEn(pair.en, idx)}
                      className="inline-flex items-center gap-1.5 rounded border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink hover:bg-raised transition-colors cursor-pointer"
                    >
                      <span>🔊 {isPlaying ? "재생 중..." : "원문 듣기"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleRevealTranslation(idx)}
                      className={
                        "rounded px-2.5 py-1 text-[11.5px] font-medium transition-colors cursor-pointer " +
                        (isRevealed
                          ? "bg-raised text-ink border border-line font-semibold"
                          : "bg-ink text-surface hover:opacity-90")
                      }
                    >
                      {isRevealed ? "해석 숨기기" : "💡 해석 보기"}
                    </button>
                  </div>
                </div>

                {/* English sentence */}
                <div className="mt-3.5 pl-8 text-[16px] font-medium text-ink font-serif leading-relaxed">
                  {pair.en}
                </div>

                {/* Korean translation (revealable) */}
                {isRevealed ? (
                  <div className="mt-3 pl-8 border-t border-line/60 pt-3 text-[14.5px] text-ink-soft leading-relaxed animate-in fade-in">
                    <span className="font-mono text-[11px] font-bold text-ink-faint mr-2 uppercase">
                      해석:
                    </span>
                    {pair.ko}
                  </div>
                ) : (
                  <div className="mt-2 pl-8">
                    <button
                      type="button"
                      onClick={() => toggleRevealTranslation(idx)}
                      className="text-[12px] text-ink-faint hover:text-ink cursor-pointer underline decoration-dotted"
                    >
                      스스로 번역해본 후 클릭하여 한글 해석 확인하기
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ) : null}

      {/* 5. Reading Notes & Summary Notepad (독해 요약 및 핵심 어휘 노트) */}
      <section aria-label="Reading Notes" className="rounded-xl border border-line bg-surface p-5 shadow-xs">
        <div className="mb-3.5 flex items-center justify-between border-b border-line/70 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-semibold uppercase text-ink tracking-wider">
              📝 독해 핵심 메모 & 어휘 노트 (Reading Notepad)
            </span>
            {savedAt ? (
              <span className="font-mono text-[10.5px] text-ink-faint">
                자동 저장됨 ({savedAt})
              </span>
            ) : null}
          </div>

          <span className="font-mono text-[11px] text-ink-faint">
            {notes.length}자
          </span>
        </div>

        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="지문의 핵심 주제문, 새로 배운 단어, 문법 포인트 등을 자유롭게 메모하세요... (실시간 자동 저장)"
          className="w-full rounded-lg border border-line/80 bg-raised/20 p-3.5 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-ink focus:bg-surface focus:outline-none transition-colors"
        />
      </section>


    </div>
  );
}

// Helpers
function isEnglish(text: string): boolean {
  if (!text) return false;
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  const hangul = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;
  return latin >= hangul && latin > 0;
}

function cleanSentenceText(text: string): string {
  if (!text) return "";
  return text
    .replace(/^\s*\d+[\.\)]\s*/, "")
    .replace(/\s*\/\s*/g, " ")
    .trim();
}

function splitSentences(text: string): string[] {
  if (!text) return [];
  return text
    .split(/(?<=[.?!])\s+/)
    .map((s) => cleanSentenceText(s))
    .filter((s) => s.length > 0);
}

function alignSentences(enSents: string[], koSents: string[]) {
  if (enSents.length === 0 && koSents.length === 0) return [];
  if (enSents.length === 0) return koSents.map((k) => ({ en: "", ko: k }));
  if (koSents.length === 0) return enSents.map((e) => ({ en: e, ko: "" }));

  if (enSents.length === koSents.length) {
    return enSents.map((en, i) => ({ en, ko: koSents[i] }));
  }

  const result: { en: string; ko: string }[] = [];
  if (enSents.length < koSents.length) {
    const numBuckets = enSents.length;
    const buckets: string[][] = Array.from({ length: numBuckets }, () => []);
    koSents.forEach((k, idx) => {
      const bucketIdx = Math.min(Math.floor((idx / koSents.length) * numBuckets), numBuckets - 1);
      buckets[bucketIdx].push(k);
    });
    for (let i = 0; i < numBuckets; i++) {
      result.push({ en: enSents[i], ko: buckets[i].join(" ") });
    }
  } else {
    const numBuckets = koSents.length;
    const buckets: string[][] = Array.from({ length: numBuckets }, () => []);
    enSents.forEach((e, idx) => {
      const bucketIdx = Math.min(Math.floor((idx / enSents.length) * numBuckets), numBuckets - 1);
      buckets[bucketIdx].push(e);
    });
    for (let i = 0; i < numBuckets; i++) {
      result.push({ en: buckets[i].join(" "), ko: koSents[i] });
    }
  }
  return result;
}
