"use client";

import { useState, useRef } from "react";
import type { Block } from "@/lib/types";
import { mediaUrl } from "@/lib/media";
import { AudioPlayer } from "./AudioPlayer";

interface StudentLearningViewProps {
  blocks: Block[];
  lessonKey: string;
  audioTracks?: { src: string; label?: string }[];
  chunkDrills?: { en: string; ko: string }[];
}

export function StudentLearningView({
  blocks,
  lessonKey,
  audioTracks = [],
  chunkDrills = [],
}: StudentLearningViewProps) {
  // Extract sentences and paired Korean paragraphs
  const sentBlock = blocks.find((b) => b.type === "sentences") as
    | { type: "sentences"; items: { n: string; text: string }[] }
    | undefined;
  const sentenceItems = sentBlock?.items ?? [];

  const koParas = (
    blocks.filter((b) => b.type === "paragraph" && b.lang === "ko") as {
      type: "paragraph";
      text: string;
    }[]
  ).map((p) => p.text.trim());

  const instructionText =
    blocks.find((b) => b.type === "instruction")?.text || "실전 학생 회화 훈련";

  const [studyMode, setStudyMode] = useState<"shadowing" | "chunks" | "recall">("shadowing");
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [recallInputs, setRecallInputs] = useState<Record<number, string>>({});
  const [speed, setSpeed] = useState<0.85 | 1.0>(1.0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  function playSentence(text: string, idx: number) {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Audio tracks: index 0 is usually full lesson, index 1..N correspond to sentence 1..N
    const track = audioTracks[idx + 1] || audioTracks[idx];
    if (track?.src) {
      setActiveIdx(idx);
      const audio = new Audio(mediaUrl(track.src));
      audio.playbackRate = speed;
      audioRef.current = audio;
      audio.onended = () => {
        setActiveIdx(null);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setActiveIdx(null);
        audioRef.current = null;
      };
      audio.play().catch(() => {
        setActiveIdx(null);
        audioRef.current = null;
      });
    }
  }

  function toggleReveal(idx: number) {
    setRevealed((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Pedagogical Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/90 p-4.5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-[14px]">
              🎓
            </span>
            <h2 className="text-[16px] font-bold text-ink">{instructionText}</h2>
          </div>
          <p className="text-[12px] text-ink-soft mt-1">
            Stephen Krashen의 음성 이해 입력(Comprehensible Input)과 Scott Thornbury의 격차 발견(Notice the Gap)으로 실전 회화력을 완성하세요.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center rounded-xl bg-raised/80 p-1 border border-line/70 text-[12px] font-medium">
            <button
              type="button"
              onClick={() => setStudyMode("shadowing")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                studyMode === "shadowing"
                  ? "bg-surface text-ink font-bold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              Step 1 · 🗣️ 원어민 섀도잉
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
              Step 2 · 🧩 청크 끊어말하기 ({chunkDrills.length})
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
              Step 3 · ✍️ 블라인드 역인출
            </button>
          </div>

          {/* Speed Toggle */}
          <div className="flex items-center rounded-lg border border-line/70 bg-raised/50 p-0.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setSpeed(1.0)}
              className={`px-2 py-0.5 rounded cursor-pointer ${speed === 1.0 ? "bg-surface text-ink font-semibold shadow-2xs" : "text-ink-soft"}`}
            >
              1.0x
            </button>
            <button
              type="button"
              onClick={() => setSpeed(0.85)}
              className={`px-2 py-0.5 rounded cursor-pointer ${speed === 0.85 ? "bg-surface text-ink font-semibold shadow-2xs" : "text-ink-soft"}`}
              title="0.85x 천천히"
            >
              0.85x
            </button>
          </div>
        </div>
      </div>

      {/* 2. Authentic Studio Master Audio Player */}
      {audioTracks.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              🎙️ Studio Master Audio · 원어민 원음 전체 청취
            </span>
          </div>
          <AudioPlayer
            src={audioTracks[0].src}
            label={audioTracks[0].label || "전체 대화 원음 청취 (Studio Recording)"}
          />
        </div>
      )}

      {/* MODE 1: 문장 섀도잉 (Shadowing) */}
      {studyMode === "shadowing" && (
        <div className="flex flex-col gap-3">
          {sentenceItems.map((item, idx) => {
            const isPlaying = activeIdx === idx;
            const ko = koParas[idx] || "";
            const hasSentenceAudio = Boolean(audioTracks[idx + 1]?.src || audioTracks[idx]?.src);

            return (
              <div
                key={idx}
                className={`flex flex-col gap-2 rounded-2xl border p-4.5 transition-all shadow-2xs ${
                  isPlaying
                    ? "border-primary bg-primary/[0.03] ring-1 ring-primary/40 shadow-xs"
                    : "border-line bg-surface hover:border-line-strong hover:bg-raised/30"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-raised font-mono text-[11px] font-bold text-ink">
                      {item.n || idx + 1}
                    </span>
                    <span className="text-[11.5px] font-mono text-ink-faint">
                      Sentence #{idx + 1}
                    </span>
                  </div>

                  {hasSentenceAudio && (
                    <button
                      type="button"
                      onClick={() => playSentence(item.text, idx)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[12px] font-medium transition-all cursor-pointer ${
                        isPlaying
                          ? "border-primary bg-primary text-surface font-semibold shadow-xs"
                          : "border-line bg-surface text-ink-soft hover:bg-raised hover:text-ink"
                      }`}
                    >
                      <span>🔊</span>
                      <span>{isPlaying ? "재생 중..." : "원어민 발음 듣기"}</span>
                    </button>
                  )}
                </div>

                <p className="text-[17px] font-bold text-ink leading-relaxed tracking-tight">
                  {item.text}
                </p>

                {ko && (
                  <p className="text-[14px] text-ink-soft border-t border-line/40 pt-2 font-normal leading-relaxed">
                    {ko}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODE 2: 청크 직독직해 (Chunk Drills) */}
      {studyMode === "chunks" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-line bg-surface p-4 text-[13px] text-ink-soft leading-relaxed shadow-2xs">
            <span className="font-semibold text-ink">💡 Paul Nation's Syntax Chunking:</span> 문장을 단어 단위로 쪼개지 않고 의미 덩어리(Chunk)로 묶어 발화하는 훈련입니다. 입으로 직접 소리 내어 낭독하며 체화하세요.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {chunkDrills.map((chunk, cIdx) => (
              <div
                key={cIdx}
                className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 transition-all hover:border-primary/50 hover:bg-raised/40 hover:shadow-2xs"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-[15.5px] font-bold text-ink group-hover:text-primary transition-colors">
                    {chunk.en}
                  </span>
                  <span className="text-[13px] text-ink-soft">{chunk.ko}</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-ink-faint">
                  #{cIdx + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODE 3: 스피킹 역영작 (Recall & Notice the Gap) */}
      {studyMode === "recall" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-line bg-surface p-4 text-[13px] text-ink-soft leading-relaxed shadow-2xs">
            <span className="font-semibold text-ink">✍️ Scott Thornbury's 'Notice the Gap' 훈련:</span> 우리말 의미를 보고 영어 문장을 떠올려 직접 입력해 보세요. 모범 원문과 어휘 및 통사 구조의 일치도를 실시간으로 대조합니다.
          </div>

          <div className="flex flex-col gap-3">
            {sentenceItems.map((item, idx) => {
              const isRev = revealed[idx] === true;
              const ko = koParas[idx] || "";
              const userVal = recallInputs[idx] || "";
              const hasSentenceAudio = Boolean(audioTracks[idx + 1]?.src || audioTracks[idx]?.src);

              return (
                <div
                  key={idx}
                  className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-raised font-mono text-[11px] font-bold text-ink">
                      {item.n || idx + 1}
                    </span>
                    {hasSentenceAudio && (
                      <button
                        type="button"
                        onClick={() => playSentence(item.text, idx)}
                        className="text-[12px] text-ink-soft hover:text-ink flex items-center gap-1 cursor-pointer"
                      >
                        <span>🔊 원문 듣기</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[16px] font-bold text-ink leading-relaxed">
                    {ko || item.text}
                  </p>

                  <input
                    type="text"
                    value={userVal}
                    onChange={(e) =>
                      setRecallInputs((p) => ({ ...p, [idx]: e.target.value }))
                    }
                    placeholder="영어 문장으로 말해보거나 작성해 보세요..."
                    className="w-full rounded-xl border border-line bg-raised/30 px-3.5 py-2.5 text-[14.5px] text-ink placeholder:text-ink-faint focus:border-ink focus:bg-surface focus:outline-none transition-colors"
                  />

                  {userVal.trim().length > 0 && (
                    <div className="rounded-xl border border-line/80 bg-surface/90 p-3 mt-1">
                      <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-ink-soft mb-1">
                        <span>Notice the Gap (모범 원문 대조)</span>
                        <span className="text-emerald-700">녹색: 일치 어휘</span>
                      </div>
                      {renderDiffTokens(userVal, item.text)}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-line/40">
                    <button
                      type="button"
                      onClick={() => toggleReveal(idx)}
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
                      <p className="mt-1 text-[15.5px] font-semibold text-emerald-900 leading-relaxed">
                        {item.text}
                      </p>
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
