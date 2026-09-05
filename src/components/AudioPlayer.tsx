"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { mediaUrl } from "@/lib/media";

export function AudioPlayer({
  src,
  autoplay = false,
  label,
}: {
  src?: string;
  fallbackSentences?: string[];
  lang?: string;
  gender?: string;
  autoplay?: boolean;
  label?: string;
}) {
  const { t } = useLanguage();
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el) el.playbackRate = rate;
  }, [rate]);

  function toggle() {
    if (missing || !src) return;
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
    } else {
      el.pause();
    }
  }

  function seek(seconds: number) {
    if (missing || !src) return;
    const el = ref.current;
    if (!el) return;
    el.currentTime = Math.min(Math.max(0, el.currentTime + seconds), el.duration || 0);
  }

  function scrub(e: React.ChangeEvent<HTMLInputElement>) {
    if (missing || !src) return;
    const el = ref.current;
    if (!el) return;
    el.currentTime = Number(e.target.value);
    setTime(el.currentTime);
  }

  return (
    <div className="border border-line bg-surface p-4 transition-colors duration-200 ease-out hover:border-line-strong rounded-xl shadow-xs">
      {src && !missing ? (
        <audio
          ref={ref}
          src={mediaUrl(src)}
          preload="metadata"
          autoPlay={autoplay}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onError={() => setMissing(true)}
        />
      ) : null}

      <div className="mb-2.5 flex items-center justify-between gap-2">
        {label ? (
          <p className="font-mono text-[11px] tracking-[0.18em] text-ink-faint uppercase font-medium">
            {label}
          </p>
        ) : (
          <span />
        )}

        {missing && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-0.5 font-mono text-[10.5px] text-ink-soft border border-line">
            ⚠️ 오디오 파일 연결 대기 중
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={missing || !src}
          aria-label={playing ? t("player.pause") : t("player.play")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-surface hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all shadow-xs cursor-pointer"
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <rect x="3" y="2" width="4" height="12" rx="1" />
              <rect x="9" y="2" width="4" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden className="ml-0.5">
              <path d="M4 2.5v11a.5.5 0 0 0 .77.42l8.5-5.5a.5.5 0 0 0 0-.84l-8.5-5.5A.5.5 0 0 0 4 2.5Z" />
            </svg>
          )}
        </button>

        <div className="flex flex-1 flex-col gap-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={time}
            onChange={scrub}
            disabled={missing || !src}
            aria-label={t("player.seek")}
            className="accent-primary h-1.5 w-full cursor-pointer rounded-lg bg-raised"
          />
          <div className="flex justify-between font-mono text-[11px] text-ink-faint">
            <span>{fmt(time)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => seek(-5)}
            disabled={missing || !src}
            className="rounded px-2 py-0.5 text-[11px] text-ink-soft hover:bg-raised transition-colors cursor-pointer"
          >
            -5s
          </button>
          <button
            type="button"
            onClick={() => seek(5)}
            disabled={missing || !src}
            className="rounded px-2 py-0.5 text-[11px] text-ink-soft hover:bg-raised transition-colors cursor-pointer"
          >
            +5s
          </button>
        </div>

        <div className="flex items-center gap-1">
          {[0.8, 1, 1.2].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRate(r)}
              aria-pressed={rate === r}
              className={
                "rounded px-2 py-0.5 font-mono text-[11px] transition-colors cursor-pointer " +
                (rate === r
                  ? "bg-ink text-surface font-medium"
                  : "text-ink-soft hover:bg-raised hover:text-ink")
              }
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
