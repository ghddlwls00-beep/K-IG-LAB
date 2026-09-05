"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { Block } from "@/lib/types";
import { speakText, stopSpeech } from "@/lib/speech";
import { VoiceSpeakingTester } from "./VoiceSpeakingTester";

interface PhonicsLearningViewProps {
  blocks: Block[];
  lessonKey: string;
}

export function PhonicsLearningView({ blocks, lessonKey }: PhonicsLearningViewProps) {
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

    function playNext() {
      if (idx >= rowWords.length) {
        setActiveRowIdx(null);
        return;
      }
      playWord(rowWords[idx], () => {
        idx += 1;
        setTimeout(playNext, 300);
      });
    }

    playNext();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface/90 p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/10 text-[15px] font-bold text-indigo-700">
              🔤
            </span>
            <div>
              <h2 className="text-[16px] font-bold text-ink">
                {lessonKey.startsWith("hv")
                  ? "고등 심화 어휘 매트릭스 & 발음 클리닉 (VOCA Matrix)"
                  : "중등 필수 어휘 매트릭스 & 발음 클리닉 (VOCA Matrix)"}
              </h2>
              <span className="text-[12px] font-medium text-ink-soft">
                원어민 표준 발음 청취 · 내 발음 실시간 마이크 채점 · 행별/전체 단어 연속 스트리밍
              </span>
            </div>
          </div>
        </div>

        {/* Playback Controls & Speed Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center rounded-xl bg-raised/80 p-1 border border-line/70 text-[12px] font-medium">
            <button
              type="button"
              onClick={() => setSpeed(1.0)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                speed === 1.0
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              1.0x 표준
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
            <span>{isPlayingAll ? "⏸ 일시정지" : "▶ 전체 36단어 연속 재생"}</span>
          </button>
        </div>
      </div>

      {/* 2. Selected Word Spotlight Card */}
      {selectedWord && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.03] p-5 shadow-xs flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-[32px] font-extrabold tracking-tight text-ink font-mono">
                {selectedWord}
              </span>
              <div className="flex flex-col text-[12px] text-ink-soft">
                <span className="font-mono text-ink-faint uppercase tracking-wider">
                  단어 길이: {selectedWord.length}글자
                </span>
                <span>클릭하여 원어민 표준 발음 즉시 청취</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => playWord(selectedWord)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-[13px] font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <span>🔊 발음 다시 듣기</span>
            </button>
          </div>

          {/* 🎙️ 파닉스 발음 클리닉 */}
          <div className="pt-3 border-t border-indigo-500/20">
            <VoiceSpeakingTester
              targetText={selectedWord}
              buttonLabel="🎙️ 내 발음 정밀 테스트"
            />
          </div>
        </div>
      )}

      {/* 3. 6x6 Matrix Rows */}
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
                <span className="font-mono text-[11px] font-bold text-ink-faint uppercase tracking-wider">
                  Row #{rIdx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => playRow(rIdx)}
                  className={`text-[11.5px] font-semibold cursor-pointer transition-colors ${
                    isRowActive ? "text-indigo-600 font-bold" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {isRowActive ? "🔊 이 행 재생 중..." : "▶ 이 행 연속 재생"}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {validWords.map((w, cIdx) => {
                  const isSelected = selectedWord === w;
                  const isActive = activeWord === w;

                  return (
                    <button
                      key={cIdx}
                      type="button"
                      onClick={() => playWord(w)}
                      className={`flex flex-col items-center justify-center rounded-xl border p-3 transition-all cursor-pointer text-center ${
                        isActive
                          ? "border-indigo-600 bg-indigo-600 text-white scale-105 shadow-md"
                          : isSelected
                          ? "border-indigo-500 bg-indigo-500/15 text-indigo-950 dark:text-indigo-200 font-bold ring-2 ring-indigo-500/40"
                          : "border-line bg-surface text-ink hover:border-line-strong hover:bg-raised/40"
                      }`}
                    >
                      <span className="font-mono text-[15px] font-semibold">{w}</span>
                      <span className="mt-1 text-[10.5px] text-ink-faint">🔊 발음</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
