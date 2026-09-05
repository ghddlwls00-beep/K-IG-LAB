"use client";

import { useState, useMemo } from "react";
import type { Block } from "@/lib/types";

interface PhonicsLearningViewProps {
  blocks: Block[];
  lessonKey: string;
  audioTracks?: { src: string; label?: string }[];
}

export function PhonicsLearningView({ blocks, lessonKey, audioTracks = [] }: PhonicsLearningViewProps) {
  const wordgridBlock = blocks.find((b) => b.type === "wordgrid") as
    | { type: "wordgrid"; rows: string[][] }
    | undefined;

  const rows = wordgridBlock?.rows ?? [];
  const words = useMemo(() => rows.flat().filter(Boolean), [rows]);

  const [viewMode, setViewMode] = useState<"matrix" | "fluency">("matrix");
  const [flashIndex, setFlashIndex] = useState(0);
  const [selectedWord, setSelectedWord] = useState<string>(words[0] || "");

  function handleSelectWord(word: string) {
    setSelectedWord(word);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Pedagogical Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary/5 px-4 py-3 border border-primary/15 text-[12px]">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">
            ★
          </span>
          <span className="font-semibold text-ink">
            Paul Nation(빅토리아 대학교) 교수의 어휘 습득론(Form-Meaning Association) & 4대 균형 학습 매트릭스
          </span>
        </div>
        <span className="font-mono text-[11px] text-ink-faint">
          음운 지각 → 철자-소리 연합 → 6×6 리듬 매트릭스 → 1초 유창성 인출
        </span>
      </div>

      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface/90 p-4.5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/10 text-[15px] font-bold text-indigo-700">
              🔤
            </span>
            <div>
              <h2 className="text-[16px] font-bold text-ink">
                파닉스 & 핵심 어휘 리듬 매트릭스 (Phonics Matrix)
              </h2>
              <span className="text-[12px] font-medium text-ink-soft">
                스튜디오 원음 통독 · 6×6 음소 철자 매트릭스 · 1초 단어 즉시 인출
              </span>
            </div>
          </div>
        </div>

        {/* View Mode */}
        <div className="flex items-center rounded-xl bg-raised/80 p-1 border border-line/70 text-[12px] font-medium">
          <button
            type="button"
            onClick={() => setViewMode("matrix")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "matrix"
                ? "bg-surface text-ink font-bold shadow-2xs border border-line/80"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            📊 6×6 매트릭스
          </button>
          <button
            type="button"
            onClick={() => setViewMode("fluency")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "fluency"
                ? "bg-surface text-ink font-bold shadow-2xs border border-line/80"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            ⚡ 1초 스피드 플래시
          </button>
        </div>
      </div>

      {/* Rapid Fluency Flashcard Mode (Nation's Fluency Development) */}
      {viewMode === "fluency" && words.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-8 shadow-xs flex flex-col items-center justify-center text-center gap-6">
          <div className="flex items-center justify-between w-full border-b border-line/60 pb-3">
            <span className="font-mono text-[12px] font-bold text-ink-faint">
              단어 {flashIndex + 1} / {words.length}
            </span>
            <span className="text-[12px] text-ink-soft">
              1초 내 소리와 철자를 즉각 인출하세요 (Paul Nation Fluency Strand)
            </span>
          </div>

          <div className="py-8">
            <div className="text-5xl font-extrabold tracking-wider font-mono text-ink">
              {words[flashIndex]}
            </div>
            <div className="mt-3 text-[14px] text-ink-soft">
              단어 길이: {words[flashIndex]?.length}글자 · 철자-음소 매핑 인출
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFlashIndex((p) => (p > 0 ? p - 1 : words.length - 1))}
              className="rounded-xl border border-line bg-raised px-4 py-2 text-[13px] font-semibold text-ink hover:bg-surface cursor-pointer"
            >
              ← 이전 단어
            </button>
            <button
              type="button"
              onClick={() => setFlashIndex((p) => (p < words.length - 1 ? p + 1 : 0))}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-[13px] font-bold text-white shadow-xs hover:bg-indigo-700 cursor-pointer"
            >
              다음 단어 (1초 인출) →
            </button>
          </div>
        </div>
      )}

      {/* Selected Word Spotlight Card */}
      {viewMode === "matrix" && selectedWord && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.03] p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-[32px] font-extrabold tracking-tight text-ink font-mono">
              {selectedWord}
            </span>
            <div className="flex flex-col text-[12px] text-ink-soft">
              <span className="font-mono text-ink-faint uppercase tracking-wider">
                철자 길이: {selectedWord.length}글자
              </span>
              <span>상단 스튜디오 오디오와 대조하며 발화해 보세요.</span>
            </div>
          </div>
          <span className="font-mono text-[12px] text-indigo-700 font-semibold bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">
            선택된 어휘
          </span>
        </div>
      )}

      {/* 6x6 Matrix Rows */}
      {viewMode === "matrix" && (
        <div className="flex flex-col gap-3.5">
          {rows.map((row, rIdx) => {
            const validWords = row.filter(Boolean);
            if (validWords.length === 0) return null;

            return (
              <div
                key={rIdx}
                className="rounded-2xl border border-line bg-surface p-4 shadow-2xs flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between border-b border-line/60 pb-2">
                  <span className="font-mono text-[11px] font-bold text-ink-faint uppercase tracking-wider">
                    Row #{rIdx + 1}
                  </span>
                  <span className="text-[11.5px] text-ink-soft">
                    {validWords.length}개 어휘 그룹
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {validWords.map((w, cIdx) => {
                    const isSelected = selectedWord === w;

                    return (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => handleSelectWord(w)}
                        className={`flex flex-col items-center justify-center rounded-xl border p-3.5 transition-all cursor-pointer text-center ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-500/15 text-indigo-950 dark:text-indigo-200 font-bold ring-2 ring-indigo-500/40"
                            : "border-line bg-surface text-ink hover:border-line-strong hover:bg-raised/40"
                        }`}
                      >
                        <span className="font-mono text-[15px] font-semibold">{w}</span>
                      </button>
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
