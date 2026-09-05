"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { mediaUrl } from "@/lib/media";

export interface AudioTrackInfo {
  src: string;
  label?: string;
  autoplay?: boolean;
}

export function AudioPlayer({
  src,
  tracks,
  autoplay = false,
  label,
  lang,
}: {
  src?: string;
  tracks?: AudioTrackInfo[];
  fallbackSentences?: string[];
  lang?: string;
  gender?: string;
  autoplay?: boolean;
  label?: string;
}) {
  const { t } = useLanguage();
  const ref = useRef<HTMLAudioElement>(null);

  // Normalize tracks array
  const trackList: AudioTrackInfo[] = tracks && tracks.length > 0
    ? tracks
    : src
    ? [{ src, label, autoplay }]
    : [];

  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [error, setError] = useState(false);

  const currentTrack = trackList[trackIndex] || trackList[0];
  const currentSrc = currentTrack?.src;
  const currentLabel = currentTrack?.label || label;

  useEffect(() => {
    const el = ref.current;
    if (el) el.playbackRate = rate;
  }, [rate]);

  // When trackIndex changes, reset state
  useEffect(() => {
    setTime(0);
    setError(false);
    if (ref.current) {
      ref.current.currentTime = 0;
      if (playing) {
        ref.current.play().catch(() => setPlaying(false));
      }
    }
  }, [trackIndex]);

  function toggle() {
    if (!currentSrc) return;
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      setError(false);
      el.play().catch(() => {
        setPlaying(false);
      });
    } else {
      el.pause();
    }
  }

  function seek(seconds: number) {
    if (!currentSrc) return;
    const el = ref.current;
    if (!el) return;
    el.currentTime = Math.min(Math.max(0, el.currentTime + seconds), el.duration || 0);
  }

  function scrub(e: React.ChangeEvent<HTMLInputElement>) {
    if (!currentSrc) return;
    const el = ref.current;
    if (!el) return;
    el.currentTime = Number(e.target.value);
    setTime(el.currentTime);
  }

  function prevTrack() {
    if (trackIndex > 0) {
      setTrackIndex((i) => i - 1);
    }
  }

  function nextTrack() {
    if (trackIndex < trackList.length - 1) {
      setTrackIndex((i) => i + 1);
    }
  }

  function handleEnded() {
    setPlaying(false);
    if (autoAdvance && trackIndex < trackList.length - 1) {
      setTrackIndex((i) => i + 1);
      setTimeout(() => {
        if (ref.current) {
          ref.current.play().catch(() => setPlaying(false));
        }
      }, 400);
    }
  }

  if (trackList.length === 0) return null;

  return (
    <div className="border border-line bg-surface p-4 transition-colors duration-200 ease-out hover:border-line-strong rounded-2xl shadow-xs flex flex-col gap-3">
      {currentSrc && (
        <audio
          key={currentSrc}
          ref={ref}
          src={mediaUrl(currentSrc)}
          preload="metadata"
          autoPlay={autoplay}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration);
            setError(false);
          }}
          onEnded={handleEnded}
          onError={() => {
            setPlaying(false);
            setError(true);
          }}
        />
      )}

      {/* Header bar: Track info & Multi-track controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[12px] font-bold">
            🎙️
          </span>
          <div>
            <p className="font-mono text-[12px] font-bold text-ink uppercase tracking-wider">
              {currentLabel || (trackList.length > 1 ? `오리지널 스튜디오 음원 - 트랙 ${trackIndex + 1}/${trackList.length}` : "오리지널 스튜디오 녹음 음원")}
            </p>
            {trackList.length > 1 && (
              <span className="text-[11px] text-ink-soft">
                총 {trackList.length}개 트랙 수록 · 순차 또는 개별 청취 가능
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {error && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10.5px] text-amber-800 border border-amber-500/30">
              ⚠️ 스트리밍 대기 중 (클릭하여 재생)
            </span>
          )}

          {trackList.length > 1 && (
            <button
              type="button"
              onClick={() => setAutoAdvance((a) => !a)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-mono font-medium border transition-colors cursor-pointer ${
                autoAdvance
                  ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                  : "bg-raised/60 border-line text-ink-soft hover:text-ink"
              }`}
              title="한 트랙이 끝나면 다음 트랙을 자동으로 이어서 재생합니다."
            >
              {autoAdvance ? "✓ 자동 연속 재생 ON" : "자동 연속 재생 OFF"}
            </button>
          )}
        </div>
      </div>

      {/* Main Playback Bar */}
      <div className="flex items-center gap-3">
        {/* Previous Track button (multi-track only) */}
        {trackList.length > 1 && (
          <button
            type="button"
            onClick={prevTrack}
            disabled={trackIndex === 0}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-raised/70 text-ink hover:bg-raised disabled:opacity-30 transition-all cursor-pointer"
            title="이전 트랙"
          >
            ◀
          </button>
        )}

        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={toggle}
          disabled={!currentSrc}
          aria-label={playing ? t("player.pause") : t("player.play")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-surface hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all shadow-xs cursor-pointer"
        >
          {playing ? (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <rect x="3" y="2" width="4" height="12" rx="1" />
              <rect x="9" y="2" width="4" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden className="ml-0.5">
              <path d="M4 2.5v11a.5.5 0 0 0 .77.42l8.5-5.5a.5.5 0 0 0 0-.84l-8.5-5.5A.5.5 0 0 0 4 2.5Z" />
            </svg>
          )}
        </button>

        {/* Next Track button (multi-track only) */}
        {trackList.length > 1 && (
          <button
            type="button"
            onClick={nextTrack}
            disabled={trackIndex === trackList.length - 1}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-raised/70 text-ink hover:bg-raised disabled:opacity-30 transition-all cursor-pointer"
            title="다음 트랙"
          >
            ▶
          </button>
        )}

        {/* Scrubber & Time */}
        <div className="flex flex-1 flex-col gap-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={time}
            onChange={scrub}
            disabled={!currentSrc}
            aria-label={t("player.seek")}
            className="accent-primary h-1.5 w-full cursor-pointer rounded-lg bg-raised"
          />
          <div className="flex justify-between font-mono text-[11px] text-ink-faint">
            <span>{fmt(time)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
      </div>

      {/* Multi-track quick selection pills */}
      {trackList.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin">
          <span className="font-mono text-[10.5px] font-bold text-ink-faint shrink-0 mr-1">
            트랙 바로가기:
          </span>
          {trackList.map((tr, idx) => {
            const isSelected = trackIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setTrackIndex(idx)}
                className={`shrink-0 px-2.5 py-0.5 rounded-md font-mono text-[11px] transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-ink text-surface font-bold border-ink shadow-2xs scale-105"
                    : "bg-raised/50 text-ink-soft border-line/70 hover:bg-raised hover:text-ink"
                }`}
              >
                #{idx + 1}
              </button>
            );
          })}
        </div>
      )}

      {/* Bottom controls: Seek & Speed */}
      <div className="flex items-center justify-between border-t border-line/60 pt-2 text-[11.5px]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => seek(-5)}
            disabled={!currentSrc}
            className="rounded-md px-2 py-0.5 text-ink-soft hover:bg-raised transition-colors cursor-pointer"
          >
            -5초
          </button>
          <button
            type="button"
            onClick={() => seek(5)}
            disabled={!currentSrc}
            className="rounded-md px-2 py-0.5 text-ink-soft hover:bg-raised transition-colors cursor-pointer"
          >
            +5초
          </button>
        </div>

        <div className="flex items-center gap-1">
          {[0.8, 1, 1.2].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRate(r)}
              aria-pressed={rate === r}
              className={`rounded-md px-2 py-0.5 font-mono text-[11px] transition-colors cursor-pointer ${
                rate === r
                  ? "bg-ink text-surface font-medium"
                  : "text-ink-soft hover:bg-raised hover:text-ink"
              }`}
            >
              {r}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function fmt(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
