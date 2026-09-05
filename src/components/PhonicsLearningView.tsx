"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { Block } from "@/lib/types";
import { speakText, stopSpeech } from "@/lib/speech";
import { VoiceSpeakingTester } from "./VoiceSpeakingTester";

interface PhonicsLearningViewProps {
  blocks: Block[];
  lessonKey: string;
  vocaDictionary?: Record<string, { meaning: string; searchWord?: string }> | null;
}

export function PhonicsLearningView({ blocks, lessonKey, vocaDictionary }: PhonicsLearningViewProps) {
  const wordgridBlock = blocks.find((b) => b.type === "wordgrid") as
    | { type: "wordgrid"; rows: string[][] }
    | undefined;

  const rows = wordgridBlock?.rows ?? [];
  const words = useMemo(() => rows.flat().filter(Boolean), [rows]);

  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<string>(words[0] || "");
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [speed, setSpeed] = useState<0.85 | 1.0>(1.0);
  const [activeRowIdx, setActiveRowIdx] = useState<number | null>(null);

  // Vocabulary Learning Enhancements
  const [showMeanings, setShowMeanings] = useState(true);
  const [viewTab, setViewTab] = useState<"matrix" | "cards">("matrix");
  const [memorizedWords, setMemorizedWords] = useState<Record<string, boolean>>({});
  const [cardIndex, setCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  const playIndexRef = useRef(0);
  const isPlayingRef = useRef(false);

  // Local storage key for memorized checklist
  const storageKey = `kig:voca:memorized:${lessonKey}`;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setMemorizedWords(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [storageKey]);

  function toggleMemorized(word: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    setMemorizedWords((prev) => {
      const next = { ...prev, [word]: !prev[word] };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  useEffect(() => {
    return () => {
      stopSpeech();
      isPlayingRef.current = false;
    };
  }, []);

  function getMeaning(word: string): string {
    if (!word) return "";
    if (vocaDictionary && vocaDictionary[word]) {
      return vocaDictionary[word].meaning;
    }
    // Fallback case-insensitive or clean lookup
    const clean = word.toLowerCase().replace(/[()"]/g, "").trim();
    if (vocaDictionary && vocaDictionary[clean]) {
      return vocaDictionary[clean].meaning;
    }
    return "단어";
  }

  function playWord(word: string, onEnd?: () => void) {
    stopSpeech();
    setActiveWord(word);
    setSelectedWord(word);

    speakText(word, {
      lang: "en",
      rate: speed,
      onEnd: () => {
        setActiveWord(null);
        onEnd?.();
      },
      onError: () => {
        setActiveWord(null);
        onEnd?.();
      },
    });
  }

  function handlePlayAll() {
    if (isPlayingAll) {
      isPlayingRef.current = false;
      setIsPlayingAll(false);
      stopSpeech();
      setActiveWord(null);
      setActiveRowIdx(null);
      return;
    }

    if (words.length === 0) return;
    isPlayingRef.current = true;
    setIsPlayingAll(true);
    playIndexRef.current = 0;
    playNextSequential();
  }

  function playNextSequential() {
    if (!isPlayingRef.current || playIndexRef.current >= words.length) {
      isPlayingRef.current = false;
      setIsPlayingAll(false);
      setActiveWord(null);
      setActiveRowIdx(null);
      return;
    }

    const word = words[playIndexRef.current];
    playWord(word, () => {
      playIndexRef.current += 1;
      setTimeout(() => {
        if (isPlayingRef.current) {
          playNextSequential();
        }
      }, 350);
    });
  }

  function playRow(rowIndex: number) {
    const rowWords = (rows[rowIndex] || []).filter(Boolean);
    if (rowWords.length === 0) return;

    stopSpeech();
    setActiveRowIdx(rowIndex);
    let idx = 0;

    function next() {
      if (idx >= rowWords.length) {
        setActiveRowIdx(null);
        setActiveWord(null);
        return;
      }
      const w = rowWords[idx];
      playWord(w, () => {
        idx++;
        setTimeout(next, 350);
      });
    }

    next();
  }

  const memorizedCount = useMemo(() => {
    return words.filter((w) => memorizedWords[w]).length;
  }, [words, memorizedWords]);

  const selectedMeaning = getMeaning(selectedWord);

  return (
    <div className="flex flex-col gap-6 notranslate" translate="no">
      {/* 1. Header Toolbar & Progress */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5 shadow-xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              Vocabulary Matrix ({words.length} Words)
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              암기 완료: {memorizedCount} / {words.length}
            </span>
          </div>
          <span className="text-[13.5px] font-medium text-ink">
            원어민 표준 발음 청취 및 1:1 한국어 뜻 연동 학습 시스템
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Switcher */}
          <div className="flex items-center rounded-xl border border-line bg-raised/70 p-1 text-[12px]">
            <button
              type="button"
              onClick={() => setViewTab("matrix")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                viewTab === "matrix"
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              격자 보기
            </button>
            <button
              type="button"
              onClick={() => {
                setViewTab("cards");
                setIsCardFlipped(false);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                viewTab === "cards"
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              단어 카드
            </button>
          </div>

          {/* Toggle Korean Meanings (Active Recall) */}
          <button
            type="button"
            onClick={() => setShowMeanings(!showMeanings)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-semibold transition-all cursor-pointer ${
              showMeanings
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-line bg-surface text-ink-soft hover:text-ink"
            }`}
          >
            <span>{showMeanings ? "💡 한글 뜻 켜짐" : "🙈 한글 뜻 가리기 (자가테스트)"}</span>
          </button>

          {/* Speed Control */}
          <div className="flex items-center rounded-xl border border-line bg-raised/70 p-1 text-[12px]">
            <button
              type="button"
              onClick={() => setSpeed(1.0)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                speed === 1.0
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              1.0x 보통
            </button>
            <button
              type="button"
              onClick={() => setSpeed(0.85)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                speed === 0.85
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              0.85x 느리게
            </button>
          </div>

          {/* Play All Sequential */}
          <button
            type="button"
            onClick={handlePlayAll}
            className={
              "flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-semibold transition-all cursor-pointer shadow-xs " +
              (isPlayingAll
                ? "bg-red-600 text-white"
                : "bg-ink text-surface hover:opacity-90")
            }
          >
            <span>{isPlayingAll ? "⏸ 일시정지" : `▶ 전체 ${words.length}단어 연속 재생`}</span>
          </button>
        </div>
      </div>

      {/* 2. Selected Word Spotlight Card */}
      {selectedWord && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.04] p-5 shadow-xs flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-[34px] font-extrabold tracking-tight text-ink font-mono">
                {selectedWord}
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[17px] font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedMeaning}
                  </span>
                  <span className="font-mono text-[11px] text-ink-faint">
                    ({selectedWord.length}글자)
                  </span>
                </div>
                <span className="text-[12px] text-ink-soft">
                  원어민 표준 발음 청취 및 마이크 발음 교정
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => toggleMemorized(selectedWord, e)}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[12.5px] font-bold transition-colors cursor-pointer ${
                  memorizedWords[selectedWord]
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-line bg-surface text-ink hover:bg-raised"
                }`}
              >
                <span>{memorizedWords[selectedWord] ? "✓ 암기 완료" : "○ 암기 체크"}</span>
              </button>

              <button
                type="button"
                onClick={() => playWord(selectedWord)}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-[13px] font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                <span>🔊 발음 듣기</span>
              </button>
            </div>
          </div>

          {/* 🎙️ 발음 정밀 테스트 */}
          <div className="pt-3 border-t border-indigo-500/20">
            <VoiceSpeakingTester
              targetText={selectedWord}
              buttonLabel="🎙️ 내 발음 정밀 테스트"
            />
          </div>
        </div>
      )}

      {/* 3. VIEW MODE: FLASHCARD DECK (단어 카드 플래시카드 모드) */}
      {viewTab === "cards" && words.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-8 shadow-xs flex flex-col items-center justify-center text-center gap-6">
          <div className="flex items-center justify-between w-full max-w-md text-[13px] font-mono text-ink-faint">
            <span>카드 #{cardIndex + 1} / {words.length}</span>
            <button
              type="button"
              onClick={() => toggleMemorized(words[cardIndex])}
              className={`px-2.5 py-1 rounded-md text-[11.5px] font-bold cursor-pointer transition-colors ${
                memorizedWords[words[cardIndex]]
                  ? "bg-emerald-600 text-white"
                  : "bg-raised text-ink border border-line"
              }`}
            >
              {memorizedWords[words[cardIndex]] ? "✓ 암기완료" : "○ 미암기"}
            </button>
          </div>

          <div
            onClick={() => setIsCardFlipped(!isCardFlipped)}
            className="w-full max-w-md h-56 rounded-3xl border-2 border-indigo-500/30 bg-gradient-to-b from-surface to-raised/50 p-6 flex flex-col items-center justify-center cursor-pointer shadow-sm hover:shadow-md transition-all select-none relative group"
          >
            <div className="text-[38px] font-black text-ink font-mono mb-2">
              {words[cardIndex]}
            </div>

            {isCardFlipped ? (
              <div className="text-[20px] font-bold text-indigo-600 dark:text-indigo-400 animate-in fade-in">
                {getMeaning(words[cardIndex])}
              </div>
            ) : (
              <span className="text-[12.5px] text-ink-faint group-hover:text-ink">
                (카드를 클릭하면 한국어 뜻이 나타납니다)
              </span>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playWord(words[cardIndex]);
              }}
              className="absolute bottom-4 right-4 rounded-full bg-surface border border-line p-2 text-ink hover:bg-raised shadow-2xs cursor-pointer"
              title="발음 듣기"
            >
              🔊
            </button>
          </div>

          {/* Navigation controls */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setCardIndex((prev) => (prev > 0 ? prev - 1 : words.length - 1));
                setIsCardFlipped(false);
                setSelectedWord(words[cardIndex > 0 ? cardIndex - 1 : words.length - 1]);
              }}
              className="rounded-xl border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink hover:bg-raised transition-colors cursor-pointer"
            >
              ← 이전 카드
            </button>
            <button
              type="button"
              onClick={() => setIsCardFlipped(!isCardFlipped)}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-[13px] font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              {isCardFlipped ? "앞면 보기" : "💡 뜻 확인하기"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCardIndex((prev) => (prev < words.length - 1 ? prev + 1 : 0));
                setIsCardFlipped(false);
                setSelectedWord(words[cardIndex < words.length - 1 ? cardIndex + 1 : 0]);
              }}
              className="rounded-xl border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink hover:bg-raised transition-colors cursor-pointer"
            >
              다음 카드 →
            </button>
          </div>
        </div>
      )}

      {/* 4. VIEW MODE: 6x6 MATRIX GRID */}
      {viewTab === "matrix" && (
        <div className="flex flex-col gap-3.5">
          {rows.map((row, rIdx) => {
            const validWords = row.filter(Boolean);
            if (validWords.length === 0) return null;
            const isRowActive = activeRowIdx === rIdx;

            return (
              <div
                key={rIdx}
                className="rounded-2xl border border-line bg-surface p-4 shadow-2xs flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between border-b border-line/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-ink-faint uppercase tracking-wider">
                      Row #{rIdx + 1}
                    </span>
                    <span className="font-mono text-[11px] text-ink-faint">
                      ({validWords.length}단어)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => playRow(rIdx)}
                    className={`text-[11.5px] font-semibold cursor-pointer transition-colors ${
                      isRowActive ? "text-indigo-600 font-bold" : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {isRowActive ? "🔊 이 행 연속 재생 중..." : "▶ 이 행 연속 재생"}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                  {validWords.map((w, cIdx) => {
                    const isSelected = selectedWord === w;
                    const isActive = activeWord === w;
                    const isMemorized = Boolean(memorizedWords[w]);
                    const meaning = getMeaning(w);

                    return (
                      <div
                        key={cIdx}
                        onClick={() => playWord(w)}
                        className={`group relative flex flex-col justify-between rounded-xl border p-3 transition-all cursor-pointer text-center min-h-[82px] ${
                          isActive
                            ? "border-indigo-600 bg-indigo-600 text-white scale-105 shadow-md z-10"
                            : isSelected
                            ? "border-indigo-500 bg-indigo-500/10 text-ink ring-2 ring-indigo-500/40 shadow-xs"
                            : "border-line bg-surface text-ink hover:border-line-strong hover:bg-raised/40"
                        }`}
                      >
                        {/* Word Checklist Pill */}
                        <div className="flex items-center justify-between w-full mb-1">
                          <button
                            type="button"
                            onClick={(e) => toggleMemorized(w, e)}
                            className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors cursor-pointer ${
                              isMemorized
                                ? isActive ? "bg-white text-indigo-600" : "bg-emerald-600 text-white"
                                : isActive ? "border border-white/50 text-white" : "border border-line-strong/40 text-transparent hover:text-ink-faint"
                            }`}
                            title={isMemorized ? "암기 완료 취소" : "암기 완료 체크"}
                          >
                            ✓
                          </button>
                          <span className={`font-mono text-[9px] ${isActive ? "text-white/80" : "text-ink-faint"}`}>
                            🔊
                          </span>
                        </div>

                        {/* English Word */}
                        <span className="font-mono text-[15.5px] font-bold tracking-tight">
                          {w}
                        </span>

                        {/* Korean Meaning */}
                        <div className="mt-1 min-h-[18px]">
                          {showMeanings ? (
                            <span
                              className={`text-[11.5px] font-medium line-clamp-1 ${
                                isActive
                                  ? "text-indigo-100"
                                  : isSelected
                                  ? "text-indigo-700 dark:text-indigo-300 font-semibold"
                                  : "text-ink-soft group-hover:text-ink"
                              }`}
                            >
                              {meaning}
                            </span>
                          ) : (
                            <span className="text-[10px] text-ink-faint opacity-40">
                              •••
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
