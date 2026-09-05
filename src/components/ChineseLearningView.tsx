"use client";

import { useState, useRef } from "react";
import type { Block } from "@/lib/types";
import { mediaUrl } from "@/lib/media";
import { AudioPlayer } from "./AudioPlayer";

interface ChineseLearningViewProps {
  blocks: Block[];
  lessonKey: string;
  audioTracks?: { src: string; label?: string }[];
}

export function ChineseLearningView({
  blocks,
  lessonKey,
  audioTracks = [],
}: ChineseLearningViewProps) {
  // Extract sentences with Hanzi and Pinyin
  const sentBlock = blocks.find((b) => b.type === "sentences") as
    | { type: "sentences"; items: { n: string; text: string }[] }
    | undefined;

  const rawSentences = sentBlock?.items ?? [];

  // Parse lines: line 1 = Hanzi, line 2 = Pinyin
  const parsedItems = rawSentences.map((item, idx) => {
    const lines = item.text.split("\n").map((l) => l.trim()).filter(Boolean);
    const hanzi = lines[0] || item.text;
    const pinyin = lines[1] || "";
    return {
      id: idx + 1,
      numberLabel: item.n || String(idx + 1),
      hanzi,
      pinyin,
    };
  });

  // Extract Korean translations from paragraph blocks
  const koParas = (
    blocks.filter((b) => b.type === "paragraph" && b.lang === "ko") as {
      type: "paragraph";
      text: string;
    }[]
  ).map((p) => p.text.trim());

  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [showPinyin, setShowPinyin] = useState(true);
  const [showKorean, setShowKorean] = useState(true);
  const [speed, setSpeed] = useState<0.85 | 1.0>(1.0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  function playChinese(idx: number) {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

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

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/90 p-4.5 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600/10 text-[18px]">
            🇨🇳
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-bold text-ink">중국어 실전 회화 & 병음 성조 훈련</h2>
              <span className="rounded-full bg-raised px-2 py-0.5 font-mono text-[11px] font-medium text-ink-soft border border-line">
                총 {parsedItems.length}개 구문
              </span>
            </div>
            <p className="text-[12px] text-ink-soft mt-0.5">
              원어민 발음 녹음과 한어병음(Pinyin) 및 4성 성조를 대조하며 실전 회화력을 습득하세요.
            </p>
          </div>
        </div>

        {/* Visibility Controls & Speed */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPinyin((p) => !p)}
            className={`px-2.5 py-1 text-[11.5px] rounded-lg border font-medium transition-colors cursor-pointer ${
              showPinyin
                ? "border-primary bg-primary/10 text-primary font-bold"
                : "border-line bg-raised/50 text-ink-soft hover:text-ink"
            }`}
          >
            {showPinyin ? "병음 켜짐" : "병음 가림"}
          </button>
          <button
            type="button"
            onClick={() => setShowKorean((k) => !k)}
            className={`px-2.5 py-1 text-[11.5px] rounded-lg border font-medium transition-colors cursor-pointer ${
              showKorean
                ? "border-primary bg-primary/10 text-primary font-bold"
                : "border-line bg-raised/50 text-ink-soft hover:text-ink"
            }`}
          >
            {showKorean ? "해석 켜짐" : "해석 가림"}
          </button>
        </div>
      </div>

      {/* 2. Studio Master Audio Player */}
      {audioTracks.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              🎙️ Studio Master Audio · 원어민 원음 회화 청취
            </span>
          </div>
          <AudioPlayer
            src={audioTracks[0].src}
            label={audioTracks[0].label || "중국어 전체 원음 청취 (Studio Recording)"}
          />
        </div>
      )}

      {/* 3. Sentence Cards */}
      <div className="flex flex-col gap-3">
        {parsedItems.map((item, idx) => {
          const isPlaying = activeIdx === idx;
          const ko = koParas[idx] || "";
          const hasSentenceAudio = Boolean(audioTracks[idx + 1]?.src || audioTracks[idx]?.src);

          return (
            <div
              key={item.id}
              className={`flex flex-col gap-2 rounded-2xl border p-5 transition-all shadow-2xs ${
                isPlaying
                  ? "border-red-500 bg-red-500/[0.03] ring-1 ring-red-500/40 shadow-xs"
                  : "border-line bg-surface hover:border-line-strong hover:bg-raised/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-raised font-mono text-[11px] font-bold text-ink">
                  {item.numberLabel}
                </span>

                {hasSentenceAudio && (
                  <button
                    type="button"
                    onClick={() => playChinese(idx)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[12px] font-medium transition-all cursor-pointer ${
                      isPlaying
                        ? "border-red-500 bg-red-500 text-surface font-semibold shadow-xs"
                        : "border-line bg-surface text-ink-soft hover:bg-raised hover:text-ink"
                    }`}
                  >
                    <span>🔊</span>
                    <span>{isPlaying ? "재생 중..." : "원음 듣기"}</span>
                  </button>
                )}
              </div>

              {/* Chinese Character */}
              <p className="text-[20px] font-semibold text-ink leading-relaxed tracking-wide font-sans">
                {item.hanzi}
              </p>

              {/* Pinyin */}
              {showPinyin && item.pinyin && (
                <p className="font-mono text-[13.5px] font-medium text-red-600/90 tracking-wider">
                  {item.pinyin}
                </p>
              )}

              {/* Korean Translation */}
              {showKorean && ko && (
                <p className="text-[14px] text-ink-soft border-t border-line/40 pt-2 font-normal leading-relaxed">
                  {ko}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
