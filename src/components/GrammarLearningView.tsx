"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Block } from "@/lib/types";
import { speakText, stopSpeech } from "@/lib/speech";
import { VoiceSpeakingTester } from "./VoiceSpeakingTester";

export interface GrammarItem {
  id: number;
  numberLabel: string;
  koreanText: string;
  englishText: string;
  clozeParts: { text: string; isBlank: boolean; answer?: string }[];
  targetKeywords: string[];
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
    .replace(/[.,?!;:\"'()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
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

  // Fallback if no predefined grammar keywords found
  if (candidates.length === 0) {
    for (let i = 0; i < tokens.length; i++) {
      if (/^[A-Za-z]{3,}$/.test(tokens[i])) {
        candidates.push({ index: i, word: tokens[i], clean: tokens[i].toLowerCase() });
        break;
      }
    }
  }

  // Pick up to 2 key grammar words to blank out
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
  isScript,
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
            isTheory: true,
            theoryQuestion: qText,
            theoryAnswer: aText,
          });
          qNum++;
        }
      }
      if (theoryItems.length > 0) return theoryItems;
    }

    // 2. Standard sentence extraction from main and pair blocks
    const mainSentences = blocks
      .filter((b) => b.type === "sentences")
      .flatMap((b) => (b as { type: "sentences"; items: { n: string; text: string }[] }).items);
    const pairSentences = pairBlocks
      ? pairBlocks
          .filter((b) => b.type === "sentences")
          .flatMap((b) => (b as { type: "sentences"; items: { n: string; text: string }[] }).items)
      : [];

    const count = Math.max(mainSentences.length, pairSentences.length);
    const result: GrammarItem[] = [];

    for (let i = 0; i < count; i++) {
      const m = mainSentences[i];
      const p = pairSentences[i];
      const textM = m?.text ?? "";
      const textP = p?.text ?? "";

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

      result.push({
        id: i + 1,
        numberLabel: m?.n || p?.n || String(i + 1),
        koreanText: cleanKo,
        englishText: cleanEn,
        clozeParts: parts,
        targetKeywords: keywords,
      });
    }

    return result;
  }, [blocks, pairBlocks, lessonKey]);



  // Study Mode State
  const [studyMode, setStudyMode] = useState<"composition" | "cloze" | "shadowing" | "exam">("composition");
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("normal");
  const [audioSpeed, setAudioSpeed] = useState<0.85 | 1.0>(1.0);

  // Student Work State
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selfGrades, setSelfGrades] = useState<Record<number, boolean>>({});
  const [clozeInputs, setClozeInputs] = useState<Record<number, Record<number, string>>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [shadowingRepeats, setShadowingRepeats] = useState<Record<number, number>>({});
  const [activeSpeakingId, setActiveSpeakingId] = useState<number | null>(null);

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
        if (data.shadowingRepeats) setShadowingRepeats(data.shadowingRepeats);
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
            shadowingRepeats,
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
  }, [answers, selfGrades, clozeInputs, revealedAnswers, shadowingRepeats, examSubmitted, storageKey, restored]);

  // Audio Playback
  function playEnglish(text: string, id: number) {
    if (!text) return;
    stopSpeech();
    setActiveSpeakingId(id);
    speakText(text, {
      lang: "en",
      rate: audioSpeed,
      onStart: () => setActiveSpeakingId(id),
      onEnd: () => setActiveSpeakingId(null),
      onError: () => setActiveSpeakingId(null),
    });
  }

  function playKorean(text: string) {
    if (!text) return;
    stopSpeech();
    speakText(text, { lang: "ko", rate: 1.0 });
  }

  // Self Grading & Answer Handlers
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
        delete next[id]; // toggle off
      } else {
        next[id] = passed;
      }
      return next;
    });
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
      setShadowingRepeats({});
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

  // Cloze Input Handler
  function handleClozeChange(itemId: number, partIdx: number, val: string) {
    setClozeInputs((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [partIdx]: val,
      },
    }));
  }

  // Shadowing Repeat Counter
  function handleRepeatIncrement(id: number, text: string) {
    setShadowingRepeats((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
    playEnglish(text, id);
  }

  // Metrics
  const totalCount = items.length;
  const answeredCount = items.filter((it) => (answers[it.id] || "").trim().length > 0).length;
  const correctCount = items.filter((it) => selfGrades[it.id] === true).length;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
  const accuracyPercent = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

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

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Header Toolbar & Mode Switcher */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface/90 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-[14px]">
              {course === "grammar1" ? "✍️" : "🧩"}
            </span>
            <div>
              <span className="font-semibold text-ink text-[14.5px]">
                {course === "grammar1"
                  ? "Grammar 1 : 기초 영작 및 문법 훈련"
                  : "Grammar 2 : 문법 패턴 & 구문 직독직해"}
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

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Study Mode Selector */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-raised/80 p-1 border border-line/70">
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
              <span>Step 1 · FSI 통사 영작 훈련</span>
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
              <span>Step 2 · 캠브리지 뉘앙스 대조</span>
            </button>

            <button
              type="button"
              onClick={() => setStudyMode("shadowing")}
              className={
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all cursor-pointer " +
                (studyMode === "shadowing"
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink hover:bg-surface/50")
              }
            >
              <span>⚖️</span>
              <span>Step 3 · 음성 구문 각인</span>
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
              <span>Step 4 · 종합 평가 시험</span>
            </button>
          </div>

          {/* Settings & Font Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-line/70 bg-raised/50 p-0.5 text-[11px] font-mono text-ink-soft">
              <button
                type="button"
                onClick={() => setAudioSpeed(1.0)}
                className={`px-2 py-0.5 rounded cursor-pointer ${audioSpeed === 1.0 ? "bg-surface text-ink font-semibold shadow-2xs" : ""}`}
                title="음성 속도 1.0x"
              >
                1.0x
              </button>
              <button
                type="button"
                onClick={() => setAudioSpeed(0.85)}
                className={`px-2 py-0.5 rounded cursor-pointer ${audioSpeed === 0.85 ? "bg-surface text-ink font-semibold shadow-2xs" : ""}`}
                title="음성 속도 0.85x (천천히)"
              >
                0.85x
              </button>
            </div>

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
                특대
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: ✍️ 실전 영작 훈련 (Interactive Composition Practice) */}
      {/* ========================================================================= */}
      {studyMode === "composition" && (
        <div className="flex flex-col gap-6">
          {/* Progress & Quick Actions Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col justify-between rounded-xl border border-line bg-surface p-4 shadow-2xs">
              <span className="text-[12px] font-medium text-ink-soft">작성 진행률</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-[22px] font-bold text-ink">
                  {answeredCount} <span className="text-[14px] font-normal text-ink-faint">/ {totalCount}</span>
                </span>
                <span className="font-mono text-[13px] font-semibold text-primary">
                  {progressPercent}%
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-raised">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-line bg-surface p-4 shadow-2xs">
              <span className="text-[12px] font-medium text-ink-soft">자가 채점 정답률</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-[22px] font-bold text-emerald-600">
                  {correctCount} <span className="text-[14px] font-normal text-ink-faint">개 맞음</span>
                </span>
                <span className="font-mono text-[13px] font-semibold text-emerald-600">
                  {accuracyPercent}%
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-raised">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${accuracyPercent}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col justify-between gap-2 rounded-xl border border-line bg-surface p-3 shadow-2xs">
              <span className="text-[11.5px] font-medium text-ink-soft">일괄 동작</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBatchReveal(true)}
                  className="flex-1 rounded-lg border border-line bg-raised/70 px-2.5 py-1.5 text-[12px] font-medium text-ink hover:bg-raised transition-colors cursor-pointer"
                >
                  💡 전체 정답 보기
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchReveal(false)}
                  className="flex-1 rounded-lg border border-line bg-raised/70 px-2.5 py-1.5 text-[12px] font-medium text-ink hover:bg-raised transition-colors cursor-pointer"
                >
                  🔒 전체 정답 가리기
                </button>
              </div>
              <button
                type="button"
                onClick={handleResetAll}
                className="w-full text-center text-[11px] text-ink-faint hover:text-red-500 transition-colors cursor-pointer py-0.5"
              >
                ↺ 모든 작성 내용 초기화
              </button>
            </div>
          </div>

          {/* Sentence Items List */}
          <div className="flex flex-col gap-4">
            {items.map((item) => {
              const isAnswered = (answers[item.id] || "").trim().length > 0;
              const isRevealed = revealedAnswers[item.id] === true;
              const grade = selfGrades[item.id];
              const isExact =
                isAnswered &&
                normalizeForComparison(answers[item.id]) === normalizeForComparison(item.englishText);

              return (
                <div
                  key={item.id}
                  className={
                    "flex flex-col gap-3 rounded-2xl border p-5 transition-all shadow-2xs " +
                    (grade === true
                      ? "border-emerald-500/50 bg-emerald-500/[0.02]"
                      : grade === false
                      ? "border-amber-500/50 bg-amber-500/[0.02]"
                      : "border-line bg-surface")
                  }
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-raised font-mono text-[11.5px] font-bold text-ink">
                        {item.numberLabel}
                      </span>
                      {isExact && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                          🎯 정답 일치!
                        </span>
                      )}
                      {grade === true && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                          ✓ 학습 완료
                        </span>
                      )}
                      {grade === false && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                          ↺ 복습 필요
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => playKorean(item.koreanText)}
                        className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11.5px] text-ink-soft hover:bg-raised transition-colors cursor-pointer"
                        title="우리말 듣기"
                      >
                        <span>🔊</span>
                        <span className="hidden sm:inline">우리말</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => playEnglish(item.englishText, item.id)}
                        className={
                          "flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11.5px] font-medium transition-all cursor-pointer " +
                          (activeSpeakingId === item.id
                            ? "border-primary bg-primary text-surface font-semibold shadow-xs"
                            : "border-line text-ink-soft hover:bg-raised hover:text-ink")
                        }
                        title="정답 영어 발음 듣기"
                      >
                        <span>🔊</span>
                        <span>영어 정답 발음</span>
                      </button>
                    </div>
                  </div>

                  {/* Korean Prompt */}
                  <div className="rounded-xl bg-raised/50 p-3.5 border border-line/60">
                    <p className={`font-semibold text-ink ${fontStyles.korean}`}>
                      {item.koreanText}
                    </p>
                  </div>

                  {/* Student Input Field */}
                  <div className="flex flex-col gap-2">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={answers[item.id] || ""}
                        onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                        placeholder="이곳에 영어 문장을 영작해보세요... (예: I am...)"
                        className={`w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink transition-all ${fontStyles.input}`}
                      />
                      {isAnswered && (
                        <button
                          type="button"
                          onClick={() => handleAnswerChange(item.id, "")}
                          className="absolute right-3 text-[12px] text-ink-faint hover:text-ink"
                          title="지우기"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <VoiceSpeakingTester
                        targetText={item.englishText}
                        buttonLabel="🎙️ 마이크로 말해서 영작하기"
                        onSuccess={(transcript, score) => {
                          handleAnswerChange(item.id, transcript);
                          if (score >= 80) {
                            toggleSelfGrade(item.id, true);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons & Self-Grading */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-line/50">
                    <button
                      type="button"
                      onClick={() => toggleReveal(item.id)}
                      className={
                        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-all cursor-pointer " +
                        (isRevealed
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 font-semibold"
                          : "border-line bg-raised/50 text-ink-soft hover:bg-raised hover:text-ink")
                      }
                    >
                      <span>{isRevealed ? "🔒 정답 가리기" : "💡 정답 확인"}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11.5px] text-ink-faint mr-1 hidden sm:inline">자가 채점:</span>
                      <button
                        type="button"
                        onClick={() => toggleSelfGrade(item.id, true)}
                        className={
                          "flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-all cursor-pointer " +
                          (grade === true
                            ? "border-emerald-500 bg-emerald-500 text-surface font-semibold shadow-xs"
                            : "border-line bg-surface text-ink-soft hover:border-emerald-500/50 hover:text-emerald-600")
                        }
                      >
                        <span>✓</span>
                        <span>맞음</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSelfGrade(item.id, false)}
                        className={
                          "flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-all cursor-pointer " +
                          (grade === false
                            ? "border-amber-500 bg-amber-500 text-surface font-semibold shadow-xs"
                            : "border-line bg-surface text-ink-soft hover:border-amber-500/50 hover:text-amber-600")
                        }
                      >
                        <span>↺</span>
                        <span>다시 풀기</span>
                      </button>
                    </div>
                  </div>

                  {/* Revealed Model Answer Card */}
                  {isRevealed && (
                    <div className="mt-2 flex flex-col gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold tracking-wider text-emerald-700 uppercase">
                          모범 답안 (Model Answer)
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(item.englishText, item.id)}
                            className="text-[11px] text-ink-soft hover:text-ink px-1.5 py-0.5 rounded hover:bg-surface transition-colors cursor-pointer"
                          >
                            {copiedId === item.id ? "✓ 복사됨" : "문장 복사"}
                          </button>
                          <button
                            type="button"
                            onClick={() => playEnglish(item.englishText, item.id)}
                            className="text-[11.5px] text-emerald-700 hover:text-emerald-800 font-medium px-2 py-0.5 rounded hover:bg-emerald-500/10 cursor-pointer"
                          >
                            🔊 발음 듣기
                          </button>
                        </div>
                      </div>
                      <p className={`font-semibold text-emerald-900 tracking-tight ${fontStyles.english}`}>
                        {item.englishText}
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
      {/* MODE 2: 🧩 문법 빈칸 퀴즈 (Grammar Cloze & Pattern Drill) */}
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
                    <button
                      type="button"
                      onClick={() => playEnglish(item.englishText, item.id)}
                      className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-[11.5px] text-ink-soft hover:bg-raised transition-colors cursor-pointer"
                    >
                      <span>🔊</span>
                      <span>전체 문장 듣기</span>
                    </button>
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
      {/* MODE 3: ⚖️ 한/영 대조 & 구문 섀도잉 (Bilingual Syntax & Shadowing) */}
      {/* ========================================================================= */}
      {studyMode === "shadowing" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 text-[13px] text-ink-soft shadow-2xs">
            <div>
              <span className="font-semibold text-ink">🗣️ 구문 섀도잉 훈련:</span> 카드를 누르면 원어민 발음이
              재생됩니다. 소리를 들으며 억양과 문법 어순을 그대로 따라 말해보세요. (3회 이상 반복 권장)
            </div>
            <div className="flex items-center gap-1 font-mono text-[11.5px] text-ink-faint">
              <span>목표: 각 문장 3회 이상 섀도잉</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {items.map((item) => {
              const repeats = shadowingRepeats[item.id] || 0;
              const isSpeaking = activeSpeakingId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => handleRepeatIncrement(item.id, item.englishText)}
                  className={
                    "group flex flex-col gap-2.5 rounded-2xl border p-4.5 transition-all cursor-pointer shadow-2xs " +
                    (isSpeaking
                      ? "border-primary bg-primary/[0.04] ring-1 ring-primary/40 shadow-xs"
                      : "border-line bg-surface hover:border-line-strong hover:bg-raised/30")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-raised font-mono text-[11px] font-bold text-ink">
                        {item.numberLabel}
                      </span>
                      <span
                        className={
                          "rounded-full px-2 py-0.5 font-mono text-[11px] font-medium transition-colors " +
                          (repeats >= 3
                            ? "bg-emerald-500/15 text-emerald-700 font-semibold"
                            : repeats > 0
                            ? "bg-primary/10 text-primary"
                            : "bg-raised text-ink-faint")
                        }
                      >
                        {repeats >= 3 ? "✓ 3회 달성!" : `${repeats}회 연습`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(item.englishText, item.id);
                        }}
                        className="rounded p-1 text-[11px] text-ink-faint hover:text-ink hover:bg-raised transition-colors"
                        title="문장 복사"
                      >
                        {copiedId === item.id ? "✓" : "📋"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playEnglish(item.englishText, item.id);
                        }}
                        className={
                          "flex h-7 w-7 items-center justify-center rounded-full transition-all " +
                          (isSpeaking
                            ? "bg-primary text-surface scale-110 shadow-xs"
                            : "bg-raised text-ink-soft group-hover:bg-ink group-hover:text-surface")
                        }
                        title="발음 듣기"
                      >
                        <span className="text-[12px]">🔊</span>
                      </button>
                    </div>
                  </div>

                  <p className={`font-semibold text-ink group-hover:text-primary transition-colors ${fontStyles.english}`}>
                    {item.englishText}
                  </p>

                  <p className="text-[14px] text-ink-soft border-t border-line/40 pt-2 font-normal">
                    {item.koreanText}
                  </p>

                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="pt-2 border-t border-line/40 mt-1"
                  >
                    <VoiceSpeakingTester
                      targetText={item.englishText}
                      buttonLabel="🎙️ 내 발음 채점 및 섀도잉 검증"
                      onSuccess={(transcript, score) => {
                        if (score >= 70) {
                          setShadowingRepeats((prev) => ({
                            ...prev,
                            [item.id]: (prev[item.id] || 0) + 1,
                          }));
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 4: 📝 모의 영작 시험지 (Full Mock Exam Sheet) */}
      {/* ========================================================================= */}
      {studyMode === "exam" && (
        <div className="flex flex-col gap-6">
          {/* Exam Header & Score Summary */}
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-[16px] font-bold text-ink flex items-center gap-2">
                  <span>📝</span> 실전 영작 모의 시험
                </h3>
                <p className="mt-1 text-[12.5px] text-ink-soft">
                  각 번호의 우리말을 읽고 정확한 영어 문장으로 영작하세요. 모든 문항 작성 후 [전체 채점하기]를 누르면
                  자동으로 점수와 상세 오답 분석이 제공됩니다.
                </p>
              </div>

              {examResults && (
                <div className="flex items-center gap-3 rounded-xl bg-raised p-3 border border-line">
                  <div className="text-right">
                    <span className="block text-[11px] font-medium text-ink-soft">최종 획득 점수</span>
                    <span className="text-[24px] font-bold text-primary">{examResults.score}점</span>
                  </div>
                  <div className="h-8 w-px bg-line" />
                  <div className="text-[11.5px] text-ink-soft">
                    <div>정답 일치: <span className="font-semibold text-emerald-600">{examResults.exactMatches}</span>개</div>
                    <div>부분 일치: <span className="font-semibold text-amber-600">{examResults.partialMatches}</span>개</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Exam Questions List */}
          <div className="flex flex-col divide-y divide-line/60 rounded-2xl border border-line bg-surface shadow-2xs overflow-hidden">
            {items.map((item) => {
              const userVal = answers[item.id] || "";
              const res = examResults?.itemScores[item.id];

              return (
                <div key={item.id} className="flex flex-col gap-3 p-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] font-bold text-ink-soft">
                        Q{item.numberLabel}.
                      </span>
                      <span className={`font-semibold text-ink ${fontStyles.korean}`}>
                        {item.koreanText}
                      </span>
                    </div>

                    {examSubmitted && (
                      <div>
                        {res === "exact" && (
                          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11.5px] font-bold text-emerald-700">
                            ✓ 정답 (100점)
                          </span>
                        )}
                        {res === "partial" && (
                          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11.5px] font-bold text-amber-700">
                            △ 부분 정답 (70점)
                          </span>
                        )}
                        {res === "incorrect" && (
                          <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-[11.5px] font-bold text-red-600">
                            ✕ 오답 (0점)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Input Line */}
                  <div className="flex flex-col gap-1.5">
                    <input
                      type="text"
                      disabled={examSubmitted}
                      value={userVal}
                      onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                      placeholder="답안을 입력하세요..."
                      className={
                        "w-full rounded-lg border px-3.5 py-2 text-ink placeholder:text-ink-faint transition-all " +
                        (examSubmitted
                          ? res === "exact"
                            ? "border-emerald-500/60 bg-emerald-500/[0.04]"
                            : res === "partial"
                            ? "border-amber-500/60 bg-amber-500/[0.04]"
                            : "border-red-500/60 bg-red-500/[0.04]"
                          : "border-line bg-surface focus:border-ink focus:ring-1 focus:ring-ink")
                      }
                    />
                  </div>

                  {/* Model Answer after Submission */}
                  {examSubmitted && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-raised/50 p-2.5 text-[13px] border border-line/60">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-emerald-700">모범 답안:</span>
                        <span className="font-medium text-ink">{item.englishText}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => playEnglish(item.englishText, item.id)}
                        className="text-[11.5px] text-primary hover:underline cursor-pointer"
                      >
                        🔊 발음 청취
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Exam Submit Actions */}
          <div className="sticky bottom-6 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 p-4 shadow-lg backdrop-blur-md">
            <div className="text-[12.5px] text-ink-soft">
              작성 완료: <span className="font-bold text-ink">{answeredCount}</span> / {totalCount} 문항
            </div>

            <div className="flex items-center gap-2">
              {examSubmitted ? (
                <button
                  type="button"
                  onClick={() => setExamSubmitted(false)}
                  className="rounded-xl border border-line bg-raised px-4 py-2 text-[13px] font-medium text-ink hover:bg-raised/80 transition-colors cursor-pointer"
                >
                  ↺ 답안 다시 수정하기
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setExamSubmitted(true)}
                  className="rounded-xl bg-ink px-6 py-2 text-[13px] font-bold text-surface shadow-xs hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
                >
                  🎯 전체 시험 채점하기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
