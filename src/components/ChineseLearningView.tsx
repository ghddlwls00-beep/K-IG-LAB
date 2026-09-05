"use client";

import { useState, useEffect } from "react";
import type { Block } from "@/lib/types";
import { speakText, stopSpeech } from "@/lib/speech";
import { mediaUrl } from "@/lib/media";

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

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  function playChinese(hanzi: string, idx: number) {
    stopSpeech();
    setActiveIdx(idx);

    // If native Chinese audio tracks exist
    const track = audioTracks[idx + 1] || audioTracks[idx];
    if (track?.src) {
      const audio = new Audio(mediaUrl(track.src));
      audio.playbackRate = speed;
      audio.onended = () => setActiveIdx(null);
      audio.onerror = () => {
        playWithTts(hanzi, idx);
      };
      audio.play().catch(() => playWithTts(hanzi, idx));
    } else {
      playWithTts(hanzi, idx);
    }
  }

  function playWithTts(hanzi: string, idx: number) {
    speakText(hanzi, {
      lang: "zh",
      rate: speed,
      onStart: () => setActiveIdx(idx),
      onEnd: () => setActiveIdx(null),
      onError: () => setActiveIdx(null),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/90 p-4 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600/10 text-[18px]">
            🇨🇳
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-ink">중국어 실전 회화 & 성조 훈련</h2>
              <span className="rounded-full bg-raised px-2 py-0.5 font-mono text-[11px] font-medium text-ink-soft border border-line">
                총 {parsedItems.length}개 문장
              </span>
            </div>
            <p className="text-[12px] text-ink-soft mt-0.5">
              정확한 성조 병음(Pinyin)을 보며 원어민 음성을 따라 발음해 보세요.
            </p>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPinyin((p) => !p)}
            className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-medium transition-colors cursor-pointer ${
              showPinyin ? "border-primary bg-primary text-surface font-semibold" : "border-line bg-surface text-ink-soft hover:text-ink"
            }`}
          >
            병음 {showPinyin ? "ON" : "OFF"}
          </button>

          <button
            type="button"
            onClick={() => setShowKorean((p) => !p)}
            className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-medium transition-colors cursor-pointer ${
              showKorean ? "border-ink bg-raised text-ink font-semibold" : "border-line bg-surface text-ink-soft hover:text-ink"
            }`}
          >
            한글 뜻 {showKorean ? "ON" : "OFF"}
          </button>

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

      {/* 2. Chinese Sentence Cards */}
      <div className="flex flex-col gap-3.5">
        {parsedItems.map((item, idx) => {
          const isPlaying = activeIdx === idx;
          const ko = koParas[idx] || "";

          return (
            <div
              key={idx}
              className={`flex flex-col gap-2 rounded-2xl border p-5 transition-all shadow-2xs ${
                isPlaying
                  ? "border-red-600 bg-red-600/[0.03] ring-1 ring-red-600/40 shadow-xs"
                  : "border-line bg-surface hover:border-line-strong hover:bg-raised/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-raised font-mono text-[11px] font-bold text-ink">
                  {item.numberLabel}
                </span>

                <button
                  type="button"
                  onClick={() => playChinese(item.hanzi, idx)}
                  className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11.5px] font-medium transition-all cursor-pointer ${
                    isPlaying
                      ? "border-red-600 bg-red-600 text-white font-semibold shadow-xs"
                      : "border-line bg-surface text-ink-soft hover:bg-raised hover:text-ink"
                  }`}
                >
                  <span>🔊</span>
                  <span>{isPlaying ? "재생 중..." : "중국어 발음"}</span>
                </button>
              </div>

              {/* Chinese Hanzi */}
              <p className="text-[19px] font-medium text-ink font-serif tracking-wide leading-relaxed">
                {item.hanzi}
              </p>

              {/* Pinyin */}
              {showPinyin && item.pinyin && (
                <p className="font-mono text-[13.5px] text-primary/90 font-medium tracking-normal -mt-0.5">
                  {item.pinyin}
                </p>
              )}

              {/* Korean Meaning */}
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
