"use client";

import { useState, useRef, useEffect } from "react";
import type { Block } from "@/lib/types";
import { speakText, stopSpeech } from "@/lib/speech";

interface PhonicsLearningViewProps {
  blocks: Block[];
  lessonKey: string;
}

export function PhonicsLearningView({ blocks, lessonKey }: PhonicsLearningViewProps) {
  const wordgridBlock = blocks.find((b) => b.type === "wordgrid") as
    | { type: "wordgrid"; rows: string[][] }
    | undefined;

  const words = wordgridBlock?.rows.flat().filter(Boolean) ?? [];

  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [speed, setSpeed] = useState<0.8 | 1.0>(1.0);
  const [playedWords, setPlayedWords] = useState<Record<string, boolean>>({});

  const playIndexRef = useRef(0);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    return () => {
      stopSpeech();
      isPlayingRef.current = false;
    };
  }, []);

  function playWord(word: string, onEnd?: () => void) {
    stopSpeech();
    setActiveWord(word);
    setPlayedWords((prev) => ({ ...prev, [word]: true }));

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

  const masteredCount = Object.keys(playedWords).length;
  const progressPercent = words.length > 0 ? Math.round((masteredCount / words.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/90 p-4 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-[18px]">
            🔤
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-ink">파닉스 발음 훈련 매트릭스</h2>
              <span className="rounded-full bg-raised px-2 py-0.5 font-mono text-[11px] font-medium text-ink-soft border border-line">
                총 {words.length}개 핵심 어휘
              </span>
            </div>
            <p className="text-[12px] text-ink-soft mt-0.5">
              단어를 클릭하면 원어민 표준 발음이 재생됩니다. 소리와 철자 규칙을 연계하여 익혀보세요.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Speed Toggle */}
          <div className="flex items-center rounded-lg border border-line/70 bg-raised/50 p-0.5 text-[11.5px] font-mono">
            <button
              type="button"
              onClick={() => setSpeed(1.0)}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                speed === 1.0 ? "bg-surface text-ink font-semibold shadow-2xs" : "text-ink-soft hover:text-ink"
              }`}
            >
              1.0x
            </button>
            <button
              type="button"
              onClick={() => setSpeed(0.8)}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                speed === 0.8 ? "bg-surface text-ink font-semibold shadow-2xs" : "text-ink-soft hover:text-ink"
              }`}
              title="0.8x 천천히 듣기"
            >
              0.8x
            </button>
          </div>

          {/* Sequential Play All */}
          <button
            type="button"
            onClick={handlePlayAll}
            className={
              "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition-all cursor-pointer shadow-xs " +
              (isPlayingAll
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-ink text-surface hover:opacity-90 active:scale-95")
            }
          >
            <span>{isPlayingAll ? "⏸ 정지" : "▶ 전체 순차 듣기"}</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="rounded-xl border border-line bg-surface p-3 shadow-2xs">
        <div className="flex items-center justify-between text-[11.5px] font-mono text-ink-soft mb-1.5">
          <span>학습 진행도 (클릭하여 발음 청취 완료)</span>
          <span className="font-semibold text-ink">
            {masteredCount} / {words.length} ({progressPercent}%)
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 2. Word Matrix Grid */}
      {wordgridBlock && (
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-6 shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {words.map((word, idx) => {
              const isActive = activeWord === word;
              const isPlayed = Boolean(playedWords[word]);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => playWord(word)}
                  className={
                    "group flex flex-col items-center justify-center rounded-xl border p-3.5 transition-all duration-150 cursor-pointer text-center " +
                    (isActive
                      ? "border-primary bg-primary text-surface scale-105 shadow-md ring-2 ring-primary/30"
                      : isPlayed
                      ? "border-line bg-raised/40 text-ink hover:border-line-strong hover:bg-surface"
                      : "border-line/70 bg-surface text-ink hover:border-ink hover:scale-[1.02] shadow-2xs")
                  }
                >
                  <span
                    className={
                      "font-mono text-[14px] font-semibold tracking-tight transition-colors " +
                      (isActive ? "text-surface" : "text-ink group-hover:text-primary")
                    }
                  >
                    {word}
                  </span>
                  <span
                    className={
                      "mt-1 text-[10.5px] transition-colors " +
                      (isActive ? "text-surface/80" : "text-ink-faint group-hover:text-ink-soft")
                    }
                  >
                    {isActive ? "재생 중..." : "🔊 클릭"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
