"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { mediaUrl } from "@/lib/media";

/**
 * Replaces the legacy `<embed src="...mp3">` player.
 *
 * The original pages relied on a browser plugin for playback and offered only
 * whatever transport the plugin drew. This gives the drill the controls it
 * actually needs: play/pause, a scrub bar, replay, and an adjustable speed —
 * the last one matters for dictation practice and the archive never had it.
 */
export function AudioPlayer({
  src,
  autoplay = false,
  label,
}: {
  src: string;
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
    const el = ref.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }

  function seek(seconds: number) {
    const el = ref.current;
    if (!el) return;
    el.currentTime = Math.min(Math.max(0, el.currentTime + seconds), el.duration || 0);
  }

  function scrub(e: React.ChangeEvent<HTMLInputElement>) {
    const el = ref.current;
    if (!el) return;
    el.currentTime = Number(e.target.value);
    setTime(el.currentTime);
  }

  if (missing) {
    return (
      <div className="border border-dashed border-line px-4 py-3 text-[13px] text-ink-soft">
        {t("player.missingAudio")}
        <span className="ml-1 font-mono text-xs">{src.split("/").pop()}</span>
      </div>
    );
  }

  return (
    <div className="border border-line p-3 transition-colors duration-200 ease-out hover:border-line-strong">
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

      {label ? (
        <p className="mb-2.5 font-mono text-[10.5px] tracking-[0.18em] text-ink-faint uppercase">
          {label}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? t("player.pause") : t("player.play")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-surface hover:scale-105 active:scale-95"
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <rect x="3" y="2" width="4" height="12" rx="1" />
              <rect x="9" y="2" width="4" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M4 2.5v11a.5.5 0 0 0 .77.42l8.5-5.5a.5.5 0 0 0 0-.84l-8.5-5.5A.5.5 0 0 0 4 2.5Z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => seek(-5)}
          aria-label={t("player.back5")}
          className="px-2 py-1 font-mono text-[11px] text-ink-soft hover:bg-raised hover:text-ink"
        >
          −5s
        </button>

        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={time}
          onChange={scrub}
          aria-label={t("player.seek")}
          className="h-0.5 flex-1 cursor-pointer appearance-none bg-line accent-[var(--ink)] hover:h-1"
        />

        <span className="w-20 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink-faint">
          {fmt(time)} / {fmt(duration)}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1">
        <span className="mr-1 font-mono text-[10.5px] tracking-wide text-ink-faint uppercase">{t("player.speed")}</span>
        {[0.75, 1, 1.25].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRate(r)}
            aria-pressed={rate === r}
            className={
              "px-2 py-0.5 font-mono text-[11px] " +
              (rate === r
                ? "bg-ink text-surface"
                : "text-ink-soft hover:bg-raised hover:text-ink")
            }
          >
            {r}×
          </button>
        ))}
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
