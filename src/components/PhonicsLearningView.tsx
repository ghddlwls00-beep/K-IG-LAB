"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { Block } from "@/lib/types";
import { speakText, stopSpeech } from "@/lib/speech";

interface PhonicsLearningViewProps {
  blocks: Block[];
  lessonKey: string;
}

// Oxford morphological stress analyzer for English word families
function analyzeWordPhonology(word: string): {
  syllables: string[];
  stressedIndex: number;
  rule: string;
  category: string;
} {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  
  // Suffix rules (Oxford English Grammar / Phonology)
  if (clean.endsWith("tion") || clean.endsWith("sion")) {
    const parts = clean.split(/(tion|sion)$/);
    const stem = parts[0];
    const syls = splitRoughSyllables(stem).concat([parts[1]]);
    return {
      syllables: syls,
      stressedIndex: Math.max(0, syls.length - 2),
      rule: "[-tion / -sion 규칙] 접미사 바로 앞 음절에 1차 주강세(Primary Stress)가 부여됩니다.",
      category: "명사 파생어 (Nominal Derivation)",
    };
  }

  if (clean.endsWith("ity")) {
    const parts = clean.split(/(ity)$/);
    const stem = parts[0];
    const syls = splitRoughSyllables(stem).concat(["i", "ty"]);
    return {
      syllables: syls,
      stressedIndex: Math.max(0, syls.length - 3),
      rule: "[-ity 규칙] 접미사 앞앞 음절(Antepenult)에 강세가 부여되며 모음이 단모음화됩니다.",
      category: "추상명사 파생어 (Abstract Noun)",
    };
  }

  if (clean.endsWith("ous")) {
    const syls = splitRoughSyllables(clean);
    return {
      syllables: syls,
      stressedIndex: Math.max(0, syls.length - 2),
      rule: "[-ous 규칙] 형용사 접미사가 붙으며 강세가 앞으로 당겨집니다.",
      category: "형용사 파생어 (Adjectival Derivation)",
    };
  }

  if (clean.startsWith("pre") || clean.startsWith("pro") || clean.startsWith("ad") || clean.startsWith("an")) {
    const syls = splitRoughSyllables(clean);
    const isVerb = syls.length >= 2;
    return {
      syllables: syls,
      stressedIndex: isVerb && syls.length > 2 ? 1 : 0,
      rule: "[어원 접두사 규칙] 어근(Root)에 강세가 부여되며 접두사는 약화(Schwa [ə]) 발음됩니다.",
      category: "어원 접두사 결합어 (Prefix + Root)",
    };
  }

  const syls = splitRoughSyllables(clean);
  return {
    syllables: syls,
    stressedIndex: 0,
    rule: "[기본 어간 강세] 어간 첫 음절에 자연스러운 리듬 강세가 부여됩니다.",
    category: "기본 어휘 (Base Lexeme)",
  };
}

function splitRoughSyllables(word: string): string[] {
  if (word.length <= 4) return [word];
  const matched = word.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi);
  return matched && matched.length > 0 ? matched : [word];
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
  const [studyView, setStudyView] = useState<"family" | "contrast" | "matrix">("family");

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

  // Selected word phonological breakdown
  const phonology = useMemo(() => analyzeWordPhonology(selectedWord), [selectedWord]);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Toolbar: Oxford-Cambridge Methodology */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/90 p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/10 text-[15px] font-bold text-indigo-700">
              OX
            </span>
            <div>
              <h2 className="text-[16px] font-bold text-ink">
                Oxford·Cambridge 어원 파생 & 강세 이동 랩 (Morpho-Phonology Lab)
              </h2>
              <span className="text-[11.5px] font-medium text-ink-soft">
                파생어 어원군(Root Families) 분석 · 접미사 강세 이동(Stress Shift) 법칙
              </span>
            </div>
          </div>
        </div>

        {/* View Switcher & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl bg-raised/80 p-1 border border-line/70 text-[12px] font-medium">
            <button
              type="button"
              onClick={() => setStudyView("family")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                studyView === "family"
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              🧬 어원 패밀리 분석
            </button>
            <button
              type="button"
              onClick={() => setStudyView("matrix")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                studyView === "matrix"
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              📊 전체 어휘 매트릭스
            </button>
          </div>

          <button
            type="button"
            onClick={handlePlayAll}
            className={
              "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[12px] font-semibold transition-all cursor-pointer shadow-xs " +
              (isPlayingAll
                ? "bg-red-600 text-white"
                : "bg-ink text-surface hover:opacity-90")
            }
          >
            <span>{isPlayingAll ? "⏸ 일시정지" : "▶ 전체 리듬 스트리밍"}</span>
          </button>
        </div>
      </div>

      {/* 2. Oxford Phonological Deep Clinic (Selected Word Inspector) */}
      {selectedWord && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.02] p-5 shadow-xs flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[12px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-500/10 px-2 py-0.5 rounded">
                {phonology.category}
              </span>
              <span className="text-[12px] text-ink-soft font-medium">
                음절 분해 및 1차 주강세(Primary Stress)
              </span>
            </div>

            <button
              type="button"
              onClick={() => playWord(selectedWord)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1 text-[12px] font-bold text-white shadow-2xs hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <span>🔊 음성 청취</span>
            </button>
          </div>

          {/* Big Syllable Display with Stressed Syllable Highlight */}
          <div className="flex items-center gap-2 py-2">
            {phonology.syllables.map((syl, i) => {
              const isStressed = i === phonology.stressedIndex;
              return (
                <div key={i} className="flex items-center gap-1.5">
                  <span
                    className={`font-mono tracking-wide transition-all ${
                      isStressed
                        ? "text-[26px] font-extrabold text-indigo-700 bg-indigo-500/15 px-3 py-1 rounded-lg border border-indigo-500/40 shadow-xs"
                        : "text-[22px] font-medium text-ink-soft"
                    }`}
                  >
                    {isStressed ? `'${syl.toUpperCase()}` : syl.toLowerCase()}
                  </span>
                  {i < phonology.syllables.length - 1 && (
                    <span className="font-mono text-ink-faint text-[16px]">·</span>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-[13px] text-ink-soft leading-relaxed">
            <span className="font-semibold text-ink">💡 캠브리지 음운학 법칙:</span> {phonology.rule}
          </p>
        </div>
      )}

      {/* 3. VIEW 1: Morphological Family Grouping (Row by Row) */}
      {studyView === "family" && (
        <div className="flex flex-col gap-4">
          {rows.map((row, rIdx) => {
            const validWords = row.filter(Boolean);
            if (validWords.length === 0) return null;

            return (
              <div
                key={rIdx}
                className="rounded-2xl border border-line bg-surface p-5 shadow-2xs flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] font-bold text-ink-faint uppercase">
                    Root Family Group #{rIdx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      let idx = 0;
                      function playNextInRow() {
                        if (idx >= validWords.length) return;
                        playWord(validWords[idx], () => {
                          idx += 1;
                          setTimeout(playNextInRow, 300);
                        });
                      }
                      playNextInRow();
                    }}
                    className="text-[11.5px] font-medium text-primary hover:underline cursor-pointer"
                  >
                    ▶ 이 그룹 연속 재생
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
                            ? "border-primary bg-primary text-surface scale-105 shadow-xs"
                            : isSelected
                            ? "border-indigo-500 bg-indigo-500/10 text-indigo-900 font-bold ring-1 ring-indigo-500/30"
                            : "border-line bg-surface text-ink hover:border-line-strong hover:bg-raised/40"
                        }`}
                      >
                        <span className="font-mono text-[14px] font-semibold">{w}</span>
                        <span className="mt-1 text-[10px] text-ink-faint">클릭 분석</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. VIEW 2: Complete Matrix */}
      {studyView === "matrix" && (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {words.map((word, idx) => {
              const isActive = activeWord === word;
              const isSelected = selectedWord === word;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => playWord(word)}
                  className={`flex flex-col items-center justify-center rounded-xl border p-3.5 transition-all cursor-pointer text-center ${
                    isActive
                      ? "border-primary bg-primary text-surface scale-105 shadow-md"
                      : isSelected
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-900 font-bold ring-1 ring-indigo-500/40"
                      : "border-line bg-surface text-ink hover:border-line-strong"
                  }`}
                >
                  <span className="font-mono text-[14px] font-semibold">{word}</span>
                  <span className="mt-1 text-[10.5px] text-ink-faint">🔊 발음</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
