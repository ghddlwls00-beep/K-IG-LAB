"use client";

import { useState } from "react";
import { mediaUrl } from "@/lib/media";

/**
 * CNN clips, transcoded from the original Windows Media files.
 *
 * These are 320×240 sources from 2005–2009, so they are deliberately not
 * stretched to full width — upscaling a 320px source to a modern viewport
 * looks worse than showing it at a sane size on a dark ground.
 */
export function VideoPlayer({ src }: { src: string }) {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <div className="border border-dashed border-line px-4 py-3 text-[13px] text-ink-soft">
        This clip has not been transcoded yet. Re-run the extractor with ffmpeg installed.
        <span className="ml-1 font-mono text-[11px]">{src.split("/").pop()}</span>
      </div>
    );
  }

  return (
    <div className="border border-line bg-black transition-colors duration-200 ease-out hover:border-line-strong">
      <video
        src={mediaUrl(src)}
        controls
        preload="metadata"
        onError={() => setMissing(true)}
        className="mx-auto block max-h-[60vh] w-full max-w-[480px]"
      />
    </div>
  );
}
