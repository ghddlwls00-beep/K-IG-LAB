"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Block } from "@/lib/types";

export interface GrammarItem {
  id: number;
  numberLabel: string;
  koreanText: string;
  englishText: string;
  clozeParts: { text: string; isBlank: boolean; answer?: string }[];
  targetKeywords: string[];
  tokens: string[];
  scrambled: { word: string; originalIndex: number; id: string }[];
  isTheory?: boolean;
  theoryQuestion?: string;
  theoryAnswer?: string;
}

export interface GrammarLearningViewProps {
  blocks: Block[];
  pairBlocks?: Block[] | null;
  course: string;
  lessonKey: string;
  isScript: boolean;
  audioTracks?: { src: string; label?: string }[];
}

const GRAMMAR_KEYWORDS = new Set([
  "am", "is", "are", "was", "were", "been", "being",
  "have", "has", "had", "do", "does", "did",
  "can", "could", "will", "would", "shall", "should", "may", "might", "must",
  "if", "unless", "since", "though", "although", "because", "while", "after", "before", "until", "as", "that", "whether",
  "not", "never", "no",
  "this", "that", "these", "those",
  "my", "your", "his", "her", "its", "our", "their", "mine", "yours", "hers", "theirs",
  "who", "whom", "whose", "which", "what", "where", "when", "why", "how",
  "in", "on", "at", "for", "to", "from", "with", "by", "of", "into", "out"
]);

function isEnglish(text: string): boolean {
  if (!text) return false;
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  const hangul = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;
  return latin >= hangul && latin > 0;
}

function hasKorean(text: string): boolean {
  if (!text) return false;
  return /[\uAC00-\uD7AF\u1100-\u11FF]/.test(text);
}

function cleanText(text: string): string {
  if (!text) return "";
  return text
    .replace(/^\s*\d+[\.\)]\s*/, "")
    .replace(/\s*\/\s*/g, " ")
    .trim();
}

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,?!;:"'()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderNoticingTokens(userText: string, targetText: string) {
  const userWords = userText.toLowerCase().replace(/[.,?!;:"'()]/g, "").trim().split(/\s+/).filter(Boolean);
  const targetTokens = targetText.trim().split(/(\s+|[.,?!;:"'()]+)/);
  return targetTokens.map((token, idx) => {
    const clean = token.toLowerCase().replace(/[.,?!;:"'()]/g, "").trim();
    if (!clean) return <span key={idx}>{token}</span>;
    const isMatched = userWords.includes(clean);
    return isMatched ? (
      <span key={idx} className="font-semibold text-emerald-800 dark:text-emerald-300">
        {token}
      </span>
    ) : (
      <span
        key={idx}
        className="rounded bg-amber-500/20 px-1 py-0.5 font-bold text-amber-900 dark:text-amber-200 underline decoration-amber-500 underline-offset-2"
        title="학습자 영작과 차이가 있는 문법/구문 요소 (Notice the Gap)"
      >
        {token}
      </span>
    );
  });
}

function buildCloze(enText: string): {
  parts: { text: string; isBlank: boolean; answer?: string }[];
  keywords: string[];
} {
  const tokens = enText.split(/(\s+|[.,?!;:"'()]+)/);
  const candidates: { index: number; word: string; clean: string }[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i];
    const clean = raw.toLowerCase().trim();
    if (GRAMMAR_KEYWORDS.has(clean)) {
      candidates.push({ index: i, word: raw, clean });
    }
  }

  if (candidates.length === 0) {
    for (let i = 0; i < tokens.length; i++) {
      if (/^[A-Za-z]{3,}$/.test(tokens[i])) {
        candidates.push({ index: i, word: tokens[i], clean: tokens[i].toLowerCase() });
        break;
      }
    }
  }

  const toBlank = candidates.slice(0, 2);
  const blankIndices = new Set(toBlank.map((c) => c.index));
  const keywords = toBlank.map((c) => c.word);

  const parts: { text: string; isBlank: boolean; answer?: string }[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (blankIndices.has(i)) {
      parts.push({ text: tokens[i], isBlank: true, answer: tokens[i] });
    } else {
      parts.push({ text: tokens[i], isBlank: false });
    }
  }

  return { parts, keywords };
}

export function GrammarLearningView({
  blocks,
  pairBlocks = null,
  course,
  lessonKey,
}: GrammarLearningViewProps) {
  // Extract Grammar Items
  const items = useMemo<GrammarItem[]>(() => {
    // 1. Special case: gh1-020 / gh1-021 (Theory Q&A)
    const isTheoryLesson = lessonKey.includes("020") || lessonKey.includes("021");
    if (isTheoryLesson) {
      const allBlocks = [...blocks, ...(pairBlocks || [])];
      const instrs = allBlocks
        .filter((b) => b.type === "instruction")
        .map((b) => (b as { text: string }).text.trim());

      const theoryItems: GrammarItem[] = [];
      let qNum = 1;
      for (let i = 0; i < instrs.length; i++) {
        const t = instrs[i];
        if (/^\(\d+\)/.test(t)) {
          const qText = t;
          let aText = "";
          const next = instrs[i + 1] || "";
          if (next && !/^\(\d+\)/.test(next) && !next.includes("문법 확인")) {
            aText = next.replace(/^답:\s*/, "").trim();
            i++;
          }
          theoryItems.push({
            id: qNum,
            numberLabel: String(qNum),
            koreanText: qText,
            englishText: aText,
            clozeParts: [],
            targetKeywords: [],
            tokens: [],
            scrambled: [],
            isTheory: true,
            theoryQuestion: qText,
            theoryAnswer: aText,
          });
          qNum++;
        }
      }
      if (theoryItems.length > 0) return theoryItems;
    }

    // 2. Sentences block
    const sentsM = blocks
      .filter((b) => b.type === "sentences")
      .flatMap((b) => (b as { type: "sentences"; items: { n: string; text: string }[] }).items);
    const sentsP = (pairBlocks || [])
      .filter((b) => b.type === "sentences")
      .flatMap((b) => (b as { type: "sentences"; items: { n: string; text: string }[] }).items);

    const maxCount = Math.max(sentsM.length, sentsP.length);
    const result: GrammarItem[] = [];

    for (let i = 0; i < maxCount; i++) {
      const m = sentsM[i];
      const p = sentsP[i];
      const textM = m?.text || "";
      const textP = p?.text || "";

      let en = "";
      let ko = "";

      if (isEnglish(textM) && !isEnglish(textP)) {
        en = textM;
        ko = textP;
      } else if (!isEnglish(textM) && isEnglish(textP)) {
        en = textP;
        ko = textM;
      } else if (hasKorean(textM)) {
        ko = textM;
        en = textP;
      } else {
        en = textM;
        ko = textP;
      }

      const cleanEn = cleanText(en);
      const cleanKo = cleanText(ko);
      const { parts, keywords } = buildCloze(cleanEn);

      const words = cleanEn.trim().split(/\s+/).filter(Boolean);
      // Deterministic pseudo-shuffle for Syntax Slot Builder
      const indexed = words.map((w, wIdx) => ({ word: w, originalIndex: wIdx, id: `${i}-${wIdx}-${w}` }));
      const scrambled = [...indexed].sort((a, b) => {
        const hashA = (a.word.length * 7 + a.originalIndex * 13) % 17;
        const hashB = (b.word.length * 7 + b.originalIndex * 13) % 17;
        return hashA - hashB || a.word.localeCompare(b.word);
      });

      result.push({
        id: i + 1,
        numberLabel: m?.n || p?.n || String(i + 1),
        koreanText: cleanKo,
        englishText: cleanEn,
        clozeParts: parts,
        targetKeywords: keywords,
        tokens: words,
        scrambled,
      });
    }

    return result;
  }, [blocks, pairBlocks, lessonKey]);

  // Study Mode State (Scott Thornbury & Paul Nation Pedagogical Progression)
  const [studyMode, setStudyMode] = useState<"discovery" | "builder" | "cloze" | "composition" | "exam">("discovery");
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("normal");

  // Student Work State
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selfGrades, setSelfGrades] = useState<Record<number, boolean>>({});
  const [clozeInputs, setClozeInputs] = useState<Record<number, Record<number, string>>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [builderSlots, setBuilderSlots] = useState<Record<number, { word: string; originalIndex: number; id: string }[]>>({});
  const [discoveredRules, setDiscoveredRules] = useState<Record<string, boolean>>({});

  // Exam Mode State
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const storageKey = `kig:grammar:work:${lessonKey}`;

  // Restore saved progress from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.answers) setAnswers(data.answers);
        if (data.selfGrades) setSelfGrades(data.selfGrades);
        if (data.clozeInputs) setClozeInputs(data.clozeInputs);
        if (data.revealedAnswers) setRevealedAnswers(data.revealedAnswers);
        if (data.builderSlots) setBuilderSlots(data.builderSlots);
        if (data.discoveredRules) setDiscoveredRules(data.discoveredRules);
        if (data.examSubmitted !== undefined) setExamSubmitted(data.examSubmitted);
        if (data.at) setSavedAt(data.at);
      }
    } catch {
      // ignore
    }
    setRestored(true);
  }, [storageKey]);

  // Auto-save to localStorage
  useEffect(() => {
    if (!restored) return;
    const timer = setTimeout(() => {
      try {
        const at = new Date().toLocaleTimeString();
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            answers,
            selfGrades,
            clozeInputs,
            revealedAnswers,
            builderSlots,
            discoveredRules,
            examSubmitted,
            at,
          })
        );
        setSavedAt(at);
      } catch {
        // ignore
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [answers, selfGrades, clozeInputs, revealedAnswers, builderSlots, discoveredRules, examSubmitted, storageKey, restored]);

  // Handlers
  function handleAnswerChange(id: number, val: string) {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  }

  function toggleReveal(id: number) {
    setRevealedAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleSelfGrade(id: number, passed: boolean) {
    setSelfGrades((prev) => {
      const next = { ...prev };
      if (next[id] === passed) {
        delete next[id];
      } else {
        next[id] = passed;
      }
      return next;
    });
  }

  function handleClozeChange(itemId: number, partIdx: number, val: string) {
    setClozeInputs((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [partIdx]: val,
      },
    }));
  }

  // Syntax Slot Builder Actions
  function handleAddWordToSlot(itemId: number, chip: { word: string; originalIndex: number; id: string }) {
    setBuilderSlots((prev) => {
      const current = prev[itemId] || [];
      if (current.some((c) => c.id === chip.id)) return prev;
      return { ...prev, [itemId]: [...current, chip] };
    });
  }

  function handleRemoveWordFromSlot(itemId: number, chipId: string) {
    setBuilderSlots((prev) => {
      const current = prev[itemId] || [];
      return { ...prev, [itemId]: current.filter((c) => c.id !== chipId) };
    });
  }

  function handleResetSlots(itemId: number) {
    setBuilderSlots((prev) => ({ ...prev, [itemId]: [] }));
  }

  function handleSolveSlots(item: GrammarItem) {
    const sorted = [...item.scrambled].sort((a, b) => a.originalIndex - b.originalIndex);
    setBuilderSlots((prev) => ({ ...prev, [item.id]: sorted }));
  }

  function handleBatchReveal(showAll: boolean) {
    const next: Record<number, boolean> = {};
    items.forEach((it) => {
      next[it.id] = showAll;
    });
    setRevealedAnswers(next);
  }

  function handleResetAll() {
    if (typeof window !== "undefined" && window.confirm("작성하신 모든 영작 내용과 자가 채점을 초기화하시겠습니까?")) {
      setAnswers({});
      setSelfGrades({});
      setClozeInputs({});
      setRevealedAnswers({});
      setBuilderSlots({});
      setDiscoveredRules({});
      setExamSubmitted(false);
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }
  }

  function handleCopy(text: string, id: number) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  // Metrics
  const totalCount = items.length;
  const answeredCount = items.filter((it) => (answers[it.id] || "").trim().length > 0).length;
  const correctCount = items.filter((it) => selfGrades[it.id] === true).length;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
  const builderCompletedCount = items.filter((it) => {
    const placed = builderSlots[it.id] || [];
    return placed.length === it.tokens.length && placed.every((c, idx) => c.originalIndex === idx);
  }).length;

  // Exam Score Calculation
  const examResults = useMemo(() => {
    if (!examSubmitted) return null;
    let exactMatches = 0;
    let partialMatches = 0;
    const itemScores: Record<number, "exact" | "partial" | "incorrect"> = {};

    items.forEach((it) => {
      const user = normalizeForComparison(answers[it.id] || "");
      const model = normalizeForComparison(it.englishText);
      if (!user) {
        itemScores[it.id] = "incorrect";
      } else if (user === model) {
        exactMatches++;
        itemScores[it.id] = "exact";
      } else if (user.replace(/\s/g, "") === model.replace(/\s/g, "") || model.includes(user)) {
        partialMatches++;
        itemScores[it.id] = "partial";
      } else {
        itemScores[it.id] = "incorrect";
      }
    });

    const score = Math.round(((exactMatches * 1.0 + partialMatches * 0.7) / (totalCount || 1)) * 100);
    return { score, exactMatches, partialMatches, itemScores };
  }, [examSubmitted, answers, items, totalCount]);

  // Typography scaling
  const fontStyles = {
    normal: {
      korean: "text-[16px] leading-[1.6]",
      english: "text-[16.5px] leading-[1.6]",
      input: "text-[15px]",
    },
    large: {
      korean: "text-[18px] leading-[1.7]",
      english: "text-[18.5px] leading-[1.7]",
      input: "text-[16.5px]",
    },
    xlarge: {
      korean: "text-[20px] leading-[1.8]",
      english: "text-[21px] leading-[1.8]",
      input: "text-[18px]",
    },
  }[fontSize];

  // ---------------------------------------------------------------------------
  // SPECIAL THEORY LESSON VIEW (gh1-020, gh1-021)
  // ---------------------------------------------------------------------------
  if (items.length > 0 && items[0].isTheory) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[11px] font-bold text-primary uppercase tracking-wide">
              Grammar Theory & Syntactic Rules
            </span>
          </div>
          <h2 className="text-xl font-bold text-ink">핵심 문법 이론 & 원리 정리</h2>
          <p className="mt-1 text-[13.5px] text-ink-soft leading-relaxed">
            문장의 골격을 형성하는 핵심 문법 이론입니다. 질문을 읽고 스스로 답을 생각해 본 뒤 [정답 확인]을 클릭하세요.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {items.map((item) => {
            const isRevealed = revealedAnswers[item.id] === true;
            return (
              <div key={item.id} className="rounded-2xl border border-line bg-surface p-5 shadow-2xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary text-white text-[12.5px] font-bold">
                      Q{item.numberLabel}
                    </span>
                    <h3 className="font-semibold text-ink text-[15.5px] leading-snug pt-0.5">
                      {item.theoryQuestion}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleReveal(item.id)}
                    className="shrink-0 rounded-xl border border-line bg-raised px-3.5 py-1.5 text-[12px] font-medium text-ink hover:bg-surface transition-colors cursor-pointer"
                  >
                    {isRevealed ? "🔒 닫기" : "💡 정답 확인"}
                  </button>
                </div>

                {isRevealed && (
                  <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-[14.5px] text-emerald-950 dark:text-emerald-200 leading-relaxed font-medium">
                    <span className="block font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-1">
                      Grammar Answer & Rule
                    </span>
                    {item.theoryAnswer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STANDARD GRAMMAR LESSON VIEW (Thornbury & Nation Pedagogical Architecture)
  // ---------------------------------------------------------------------------
  const exemplarItems = items.slice(0, 3);

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Academic Citation & Pedagogical Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface/90 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-[14px]">
              ✍️
            </span>
            <div>
              <span className="font-semibold text-ink text-[14.5px]">
                {course === "grammar1"
                  ? "Grammar 1 : 기초 영작 및 통사 구조 훈련"
                  : "Grammar 2 : 고급 문법 패턴 & 구문 직독직해"}
              </span>
              <span className="ml-2 font-mono text-[11px] text-ink-faint">
                총 {totalCount}개 문항
              </span>
            </div>
          </div>

          {savedAt && (
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{savedAt} 자동 저장됨</span>
            </div>
          )}
        </div>

        {/* Pedagogical Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary/5 px-3.5 py-2 border border-primary/15 text-[12px]">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">
              ★
            </span>
            <span className="font-semibold text-ink">
              Scott Thornbury(케임브리지 대학교) 귀납적 문법 발견 & Paul Nation(빅토리아 대학교) 통사 구조 빌더 적용
            </span>
          </div>
          <span className="font-mono text-[11px] text-ink-faint">
            규칙 발견 → 통사 어순 빌더 → 문맥 클로즈 → 실전 영작
          </span>
        </div>

        {/* Study Mode Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-raised/80 p-1 border border-line/70">
            <button
              type="button"
              onClick={() => setStudyMode("discovery")}
              className={
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all cursor-pointer " +
                (studyMode === "discovery"
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink hover:bg-surface/50")
              }
            >
              <span>🔍</span>
              <span>Step 1 · 귀납적 문법 발견</span>
            </button>

            <button
              type="button"
              onClick={() => setStudyMode("builder")}
              className={
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all cursor-pointer " +
                (studyMode === "builder"
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink hover:bg-surface/50")
              }
            >
              <span>🧱</span>
              <span>Step 2 · 통사 구조 빌더</span>
            </button>

            <button
              type="button"
              onClick={() => setStudyMode("cloze")}
              className={
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all cursor-pointer " +
                (studyMode === "cloze"
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink hover:bg-surface/50")
              }
            >
              <span>🧩</span>
              <span>Step 3 · 문맥 속 빈칸 완성</span>
            </button>

            <button
              type="button"
              onClick={() => setStudyMode("composition")}
              className={
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all cursor-pointer " +
                (studyMode === "composition"
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink hover:bg-surface/50")
              }
            >
              <span>✍️</span>
              <span>Step 4 · 실전 상황 영작</span>
            </button>

            <button
              type="button"
              onClick={() => setStudyMode("exam")}
              className={
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all cursor-pointer " +
                (studyMode === "exam"
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink hover:bg-surface/50")
              }
            >
              <span>📝</span>
              <span>Step 5 · 종합 평가 시험</span>
            </button>
          </div>

          {/* Typography Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-line/70 bg-raised/50 p-0.5 text-[11px] font-mono text-ink-soft">
              <button
                type="button"
                onClick={() => setFontSize("normal")}
                className={`px-2 py-0.5 rounded cursor-pointer ${fontSize === "normal" ? "bg-surface text-ink font-semibold shadow-2xs" : ""}`}
              >
                기본
              </button>
              <button
                type="button"
                onClick={() => setFontSize("large")}
                className={`px-2 py-0.5 rounded cursor-pointer ${fontSize === "large" ? "bg-surface text-ink font-semibold shadow-2xs" : ""}`}
              >
                크게
              </button>
              <button
                type="button"
                onClick={() => setFontSize("xlarge")}
                className={`px-2 py-0.5 rounded cursor-pointer ${fontSize === "xlarge" ? "bg-surface text-ink font-semibold shadow-2xs" : ""}`}
              >
                최대
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: 🔍 귀납적 문법 발견 (Inductive Grammar Discovery - Scott Thornbury) */}
      {/* ========================================================================= */}
      {studyMode === "discovery" && (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 via-surface to-raised/50 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[11px] font-bold text-primary uppercase tracking-wide">
                Scott Thornbury's Inductive Discovery Method
              </span>
            </div>
            <h2 className="text-xl font-bold text-ink">공식을 외우기 전, 예문에서 패턴을 먼저 발견하세요</h2>
            <p className="mt-1.5 text-[14px] text-ink-soft leading-relaxed">
              기계적인 문법 공식 암기는 실제 발화에서 작동하지 않습니다. 아래 제시된 대표 예문 3개를 주의 깊게 관찰하고,
              단어들이 배열되는 공통 구조와 문법적 규칙성을 학습자 스스로 발견(Uncover)해 보세요.
            </p>
          </div>

          {/* Exemplar Sentences Card */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[15px] font-bold text-ink flex items-center gap-2">
              <span>📖</span>
              <span>본 레슨의 대표 핵심 예문 (Representative Exemplars)</span>
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {exemplarItems.map((item, idx) => (
                <div key={item.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-primary">
                      예문 0{idx + 1}
                    </span>
                    <span className="text-[12px] text-ink-faint">통사 패턴 관찰</span>
                  </div>
                  <p className={`font-bold text-ink ${fontStyles.english}`}>
                    {item.englishText}
                  </p>
                  <p className="text-[14px] text-ink-soft">
                    {item.koreanText}
                  </p>
                  {item.targetKeywords.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[11.5px] text-ink-faint">관찰 포인트:</span>
                      {item.targetKeywords.map((kw, kIdx) => (
                        <span key={kIdx} className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Discovery Interactive Toggle */}
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-ink text-[16px]">
                  💡 문법 규칙 발견하기 (Uncover the Rule)
                </h4>
                <p className="text-[13px] text-ink-soft mt-0.5">
                  위 예문들의 공통된 단어 배열 규칙과 어순 원리를 확인하세요.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDiscoveredRules((p) => ({ ...p, [lessonKey]: !p[lessonKey] }))}
                className="rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-white shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
              >
                {discoveredRules[lessonKey] ? "규칙 접기" : "💡 문법 규칙 공개"}
              </button>
            </div>

            {discoveredRules[lessonKey] && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 leading-relaxed text-emerald-950 dark:text-emerald-200">
                <div className="font-bold text-[14px] mb-2 text-emerald-900 dark:text-emerald-300">
                  ✓ 발견된 문법 규칙 및 통사적 원리 (Syntactic Rule):
                </div>
                <ul className="list-disc pl-5 text-[13.5px] space-y-1.5">
                  <li>
                    <span className="font-semibold">영어의 기본 통사 골격:</span> [주어 (Subject)] + [동사구 (Verb Phrase)] + [목적어/보어 (Object/Complement)] + [수식어구 (Modifiers)]의 엄격한 어순을 따릅니다.
                  </li>
                  <li>
                    <span className="font-semibold">핵심 문법 호응:</span> 본 레슨의 문장들은 <span className="underline font-bold font-mono">{exemplarItems.flatMap((e) => e.targetKeywords).slice(0, 4).join(", ") || "핵심 동사/전치사"}</span>의 문법적 역할을 중심으로 술어가 전개됩니다.
                  </li>
                  <li>
                    <span className="font-semibold">학습 다음 단계:</span> 이제 Step 2 [통사 구조 빌더]로 이동하여 흩어진 어휘 블록을 직접 올바른 어순으로 조립해 보세요!
                  </li>
                </ul>

                <button
                  type="button"
                  onClick={() => setStudyMode("builder")}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-800 text-white px-4 py-2 text-[12.5px] font-semibold hover:bg-emerald-900 transition-colors cursor-pointer"
                >
                  <span>🧱 Step 2 통사 구조 빌더로 이동하기 →</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: 🧱 통사 구조 빌더 (Syntax Slot Builder - Paul Nation & Cambridge) */}
      {/* ========================================================================= */}
      {studyMode === "builder" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4.5 text-[13px] text-ink-soft shadow-2xs">
            <div>
              <span className="font-bold text-ink">🧱 통사 구조 빌더 (Syntax Slot Builder):</span> 흩어진 어휘 블록을
              클릭하여 올바른 영어 어순대로 슬롯에 배치하세요. 한국어와 다른 영어의 어순 감각을 뇌에 능동적으로 구축합니다.
            </div>
            <div className="flex items-center gap-2 font-mono text-[12px] font-semibold text-primary">
              <span>빌더 완성:</span>
              <span>{builderCompletedCount} / {totalCount} 문항</span>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {items.map((item) => {
              const placed = builderSlots[item.id] || [];
              const placedIds = new Set(placed.map((p) => p.id));
              const available = item.scrambled.filter((c) => !placedIds.has(c.id));
              const isFull = placed.length === item.tokens.length;
              const isCorrect = isFull && placed.every((c, idx) => c.originalIndex === idx);

              return (
                <div
                  key={item.id}
                  className={
                    "flex flex-col gap-4 rounded-2xl border p-5 transition-all shadow-2xs " +
                    (isCorrect
                      ? "border-emerald-500/50 bg-emerald-500/[0.03]"
                      : isFull
                      ? "border-amber-500/50 bg-amber-500/[0.03]"
                      : "border-line bg-surface")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-raised font-mono text-[11.5px] font-bold text-ink">
                      {item.numberLabel}
                    </span>

                    <div className="flex items-center gap-2">
                      {isCorrect && (
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                          ✓ 통사 어순 완벽 일치!
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleResetSlots(item.id)}
                        className="rounded-md border border-line bg-raised px-2 py-0.5 text-[11px] text-ink-soft hover:text-ink cursor-pointer"
                      >
                        ↺ 리셋
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSolveSlots(item)}
                        className="rounded-md border border-line bg-raised px-2 py-0.5 text-[11px] text-ink-soft hover:text-ink cursor-pointer"
                      >
                        💡 정답 맞추기
                      </button>
                    </div>
                  </div>

                  {/* Korean Context */}
                  <p className="text-[14.5px] font-medium text-ink">
                    {item.koreanText}
                  </p>

                  {/* Target Slot Area */}
                  <div className="min-h-[56px] rounded-xl border-2 border-dashed border-line bg-raised/30 p-3 flex flex-wrap items-center gap-2">
                    {placed.length === 0 ? (
                      <span className="text-[13px] text-ink-faint italic select-none">
                        아래 단어 블록을 클릭하여 순서대로 배치하세요...
                      </span>
                    ) : (
                      placed.map((chip) => (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => handleRemoveWordFromSlot(item.id, chip.id)}
                          className="rounded-lg bg-ink text-surface px-3 py-1 text-[13px] font-semibold hover:opacity-80 transition-all shadow-xs cursor-pointer"
                          title="클릭하여 슬롯에서 제거"
                        >
                          {chip.word} ✕
                        </button>
                      ))
                    )}
                  </div>

                  {/* Available Scrambled Chips */}
                  {available.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-line/60">
                      {available.map((chip) => (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => handleAddWordToSlot(item.id, chip)}
                          className="rounded-lg border border-line bg-surface hover:border-primary hover:bg-primary/5 px-3 py-1.5 text-[13.5px] font-medium text-ink transition-all shadow-2xs cursor-pointer"
                        >
                          {chip.word}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {/* Feedback Message */}
                  {isFull && !isCorrect && (
                    <div className="text-[12px] text-amber-700 font-medium">
                      ⚠️ 어순이 일치하지 않습니다. 블록을 클릭해 제거한 후 다시 순서를 맞춰보세요.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: 🧩 문맥 속 빈칸 완성 (Contextual Cloze - Oxford English File) */}
      {/* ========================================================================= */}
      {studyMode === "cloze" && (
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-line bg-surface p-4 text-[13px] text-ink-soft leading-relaxed shadow-2xs">
            <span className="font-semibold text-ink">💡 문법 패턴 클로즈 퀴즈:</span> 각 문장에서 핵심이 되는
            문법 요소(동사, 접속사, 조동사, 전치사)가 빈칸으로 제시됩니다. 문맥과 우리말 뜻을 보고 빈칸에 알맞은 단어를
            직접 입력하거나 [빈칸 정답 확인]을 눌러보세요.
          </div>

          <div className="flex flex-col gap-4">
            {items.map((item) => {
              const isRevealed = revealedAnswers[item.id] === true;
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface p-5 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-raised font-mono text-[11.5px] font-bold text-ink">
                      {item.numberLabel}
                    </span>
                  </div>

                  {/* Korean Context */}
                  <p className="text-[14px] text-ink-soft font-medium">
                    {item.koreanText}
                  </p>

                  {/* Cloze Sentence with Blanks */}
                  <div className="rounded-xl border border-line/80 bg-raised/30 p-4">
                    <div className={`flex flex-wrap items-center gap-1.5 text-ink ${fontStyles.english}`}>
                      {item.clozeParts.map((part, pIdx) => {
                        if (!part.isBlank) {
                          return <span key={pIdx}>{part.text}</span>;
                        }

                        const userVal = clozeInputs[item.id]?.[pIdx] || "";
                        const isCorrect =
                          normalizeForComparison(userVal) === normalizeForComparison(part.answer || "");

                        if (isRevealed) {
                          return (
                            <span
                              key={pIdx}
                              className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-800 border border-emerald-500/40"
                            >
                              {part.answer}
                            </span>
                          );
                        }

                        return (
                          <span key={pIdx} className="inline-flex items-center">
                            <input
                              type="text"
                              value={userVal}
                              onChange={(e) => handleClozeChange(item.id, pIdx, e.target.value)}
                              placeholder="___"
                              style={{ width: `${Math.max((part.answer?.length || 3) * 14, 55)}px` }}
                              className={
                                "rounded-md border text-center font-semibold px-1.5 py-0.5 text-sm transition-all focus:outline-none " +
                                (isCorrect
                                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 font-bold"
                                  : "border-line bg-surface text-ink focus:border-ink")
                              }
                            />
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-[12px] text-ink-faint">
                      <span>핵심 문법 키워드:</span>
                      <span className="font-mono font-medium text-ink-soft">
                        {item.targetKeywords.join(", ")}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleReveal(item.id)}
                      className="rounded-lg border border-line bg-raised/60 px-3 py-1 text-[12px] font-medium text-ink hover:bg-raised transition-colors cursor-pointer"
                    >
                      {isRevealed ? "🔒 빈칸 가리기" : "💡 빈칸 정답 확인"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: ✍️ 실전 상황 영작 (Communicative Production & Notice the Gap) */}
      {/* ========================================================================= */}
      {studyMode === "composition" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 text-[13px] text-ink-soft leading-relaxed shadow-2xs">
            <div>
              <span className="font-semibold text-ink">✍️ 실전 상황 영작 훈련:</span> 우리말 문맥을 읽고,
              직접 영어 문장을 타이핑하여 작문해 보세요. [💡 모범 답안 확인]을 누르면 Scott Thornbury의
              <span className="font-semibold text-primary"> Notice the Gap</span> 원리에 따라 학습자 영작과의 차이점이 시각적으로 대조됩니다.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBatchReveal(true)}
                className="rounded-lg border border-line bg-raised px-2.5 py-1 text-[11.5px] font-medium text-ink hover:bg-surface transition-colors cursor-pointer"
              >
                전체 정답 확인
              </button>
              <button
                type="button"
                onClick={handleResetAll}
                className="rounded-lg border border-line bg-raised px-2.5 py-1 text-[11.5px] font-medium text-red-600 hover:bg-surface transition-colors cursor-pointer"
              >
                초기화
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {items.map((item) => {
              const userVal = answers[item.id] || "";
              const isRevealed = revealedAnswers[item.id] === true;
              const grade = selfGrades[item.id];
              const isExact =
                userVal.trim().length > 0 &&
                normalizeForComparison(userVal) === normalizeForComparison(item.englishText);

              return (
                <div
                  key={item.id}
                  className={
                    "flex flex-col gap-3.5 rounded-2xl border p-5 transition-all shadow-2xs " +
                    (grade === true
                      ? "border-emerald-500/50 bg-emerald-500/[0.02]"
                      : grade === false
                      ? "border-amber-500/50 bg-amber-500/[0.02]"
                      : "border-line bg-surface")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-raised font-mono text-[11.5px] font-bold text-ink">
                      {item.numberLabel}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isExact && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          🎯 모범 답안 완벽 일치!
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopy(item.englishText, item.id)}
                        className="rounded p-1 text-[11px] text-ink-faint hover:text-ink hover:bg-raised transition-colors"
                        title="모범 답안 복사"
                      >
                        {copiedId === item.id ? "✓" : "📋"}
                      </button>
                    </div>
                  </div>

                  {/* Korean Situation Prompt */}
                  <div className="rounded-xl bg-raised/50 p-3.5 border border-line/60">
                    <p className={`font-semibold text-ink ${fontStyles.korean}`}>
                      {item.koreanText || item.englishText}
                    </p>
                  </div>

                  {/* Learner Composition Input */}
                  <textarea
                    rows={2}
                    value={userVal}
                    onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                    placeholder="영어 문장을 작성해 보세요... (실시간 자동 저장)"
                    className={`w-full resize-none rounded-xl border border-line bg-surface p-3 text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink transition-all ${fontStyles.input}`}
                  />

                  {/* Controls & Self Grading */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-line/50">
                    <button
                      type="button"
                      onClick={() => toggleReveal(item.id)}
                      className="rounded-lg border border-line bg-raised/60 px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-raised transition-colors cursor-pointer"
                    >
                      {isRevealed ? "🔒 모범 답안 숨기기" : "💡 모범 답안 확인"}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11.5px] text-ink-faint mr-1">자가 진단:</span>
                      <button
                        type="button"
                        onClick={() => toggleSelfGrade(item.id, true)}
                        className={
                          "rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-all cursor-pointer " +
                          (grade === true
                            ? "border-emerald-500 bg-emerald-500 text-surface font-semibold"
                            : "border-line bg-surface text-ink-soft hover:border-emerald-500/50 hover:text-emerald-600")
                        }
                      >
                        ✓ 정답
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSelfGrade(item.id, false)}
                        className={
                          "rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-all cursor-pointer " +
                          (grade === false
                            ? "border-amber-500 bg-amber-500 text-surface font-semibold"
                            : "border-line bg-surface text-ink-soft hover:border-amber-500/50 hover:text-amber-600")
                        }
                      >
                        ↺ 복습 필요
                      </button>
                    </div>
                  </div>

                  {/* Revealed Answer with Thornbury Notice the Gap */}
                  {isRevealed && (
                    <div className="mt-1 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="block font-mono text-[11px] font-bold text-emerald-700 uppercase">
                          모범 영어 문장 & 자가 대조 (Notice the Gap)
                        </span>
                        <span className="text-[11px] text-ink-faint">
                          밑줄/배경: 내 영작과의 차이점
                        </span>
                      </div>
                      <p className={`mt-2 font-medium text-ink leading-relaxed ${fontStyles.english}`}>
                        {userVal.trim() ? renderNoticingTokens(userVal, item.englishText) : item.englishText}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: 📝 종합 평가 시험 (Comprehensive Exam) */}
      {/* ========================================================================= */}
      {studyMode === "exam" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <div>
              <h3 className="font-bold text-ink text-[16px]">
                📝 문법 영작 종합 평가 시험
              </h3>
              <p className="text-[13px] text-ink-soft mt-1">
                정답 힌트 없이 우리말 상황을 보고 스스로 영어로 영작하는 블라인드 실전 시험입니다.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setExamSubmitted(!examSubmitted)}
                className="rounded-xl bg-ink text-surface px-4 py-2 text-[13px] font-semibold hover:opacity-90 transition-all cursor-pointer shadow-xs"
              >
                {examSubmitted ? "시험 재응시 (수정 모드)" : "🚀 시험 답안 제출 및 자동 채점"}
              </button>
            </div>
          </div>

          {examSubmitted && examResults && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[12px] font-bold text-primary uppercase">Exam Score</span>
                  <div className="text-3xl font-extrabold text-ink mt-0.5">{examResults.score}점</div>
                </div>
                <div className="text-right text-[13px] text-ink-soft">
                  <div>완벽 일치: <span className="font-bold text-emerald-600">{examResults.exactMatches}</span>개</div>
                  <div>부분 일치: <span className="font-bold text-amber-600">{examResults.partialMatches}</span>개</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {items.map((item) => {
              const userVal = answers[item.id] || "";
              const scoreStatus = examResults?.itemScores?.[item.id];

              return (
                <div
                  key={item.id}
                  className={
                    "flex flex-col gap-3 rounded-2xl border p-5 shadow-2xs " +
                    (scoreStatus === "exact"
                      ? "border-emerald-500/50 bg-emerald-500/[0.03]"
                      : scoreStatus === "partial"
                      ? "border-amber-500/50 bg-amber-500/[0.03]"
                      : scoreStatus === "incorrect"
                      ? "border-red-500/40 bg-red-500/[0.02]"
                      : "border-line bg-surface")
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[12px] font-bold text-ink-faint">
                      #{item.numberLabel}
                    </span>
                    {scoreStatus === "exact" && (
                      <span className="text-[11.5px] font-bold text-emerald-600">✓ 정답 (+100%)</span>
                    )}
                    {scoreStatus === "partial" && (
                      <span className="text-[11.5px] font-bold text-amber-600">△ 부분 점수 (+70%)</span>
                    )}
                    {scoreStatus === "incorrect" && (
                      <span className="text-[11.5px] font-bold text-red-600">✕ 오답</span>
                    )}
                  </div>

                  <p className="font-semibold text-ink text-[15px]">{item.koreanText}</p>

                  <input
                    type="text"
                    disabled={examSubmitted}
                    value={userVal}
                    onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                    placeholder="영어 번역을 입력하세요..."
                    className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-[14.5px] text-ink focus:border-ink focus:outline-none transition-all disabled:bg-raised/50"
                  />

                  {examSubmitted && (
                    <div className="mt-1 rounded-xl bg-raised/50 p-3 border border-line/60">
                      <span className="font-mono text-[10.5px] font-bold text-ink-faint uppercase">모범 정답</span>
                      <p className="font-medium text-ink text-[14px] mt-0.5">{item.englishText}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
