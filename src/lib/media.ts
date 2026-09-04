/**
 * Resolves a media path to wherever the audio and video actually live.
 *
 * The extractor writes lesson JSON with app-relative paths ("/audio/ld/d001.mp3"),
 * which work as-is from `public/` in local development. In a deployment the
 * media is served from a Cloudflare R2 bucket instead, because it is roughly
 * 2GB of MP3 and MP4 — already-compressed formats that gzip shrinks by 2–4%,
 * so committing them would bloat the repository permanently for no benefit.
 *
 * Setting NEXT_PUBLIC_MEDIA_URL points every media reference at the bucket's
 * public URL (its r2.dev URL, or a custom domain). Leaving it unset keeps the
 * local behaviour, so the app still runs from a bare checkout plus an
 * extractor run.
 */

const BASE = (process.env.NEXT_PUBLIC_MEDIA_URL ?? "").replace(/\/+$/, "");

export function mediaUrl(src: string): string {
  if (!BASE) return src;
  // Anything already absolute is left alone.
  if (/^https?:\/\//i.test(src)) return src;
  return `${BASE}${src.startsWith("/") ? "" : "/"}${src}`;
}
