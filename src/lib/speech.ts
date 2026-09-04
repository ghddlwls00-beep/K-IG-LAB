/**
 * Web Speech API (TTS) engine for K-IG 교육 courseware.
 *
 * Provides native, zero-dependency browser speech synthesis for English, Korean,
 * and Chinese lessons. When server media is unavailable, this allows lessons
 * to remain 100% playable, while also powering sentence-by-sentence audio drills.
 */

export interface SpeechState {
  speaking: boolean;
  paused: boolean;
  currentText: string | null;
  currentIndex: number | null;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;
let queue: string[] = [];
let queueIndex = 0;
let queueLang = "en";
let queueRate = 1.0;
let onQueueProgress: ((index: number, text: string) => void) | null = null;
let onQueueEnd: (() => void) | null = null;

function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices();
}

/** Pick best voice for language code ('en', 'ko', 'zh'). */
export function findBestVoice(langPrefix: string): SpeechSynthesisVoice | null {
  const voices = getVoices();
  if (voices.length === 0) return null;

  const target = langPrefix.toLowerCase();
  const matches = voices.filter((v) => v.lang.toLowerCase().startsWith(target));
  if (matches.length === 0) return null;

  const preferred = matches.find(
    (v) =>
      /natural|premium|online|google|siri|neural/i.test(v.name) &&
      !/compact/i.test(v.name),
  );
  return preferred ?? matches[0];
}

/** Speak a single sentence or text snippet. */
export function speakText(
  text: string,
  options: {
    lang?: "en" | "ko" | "zh" | string;
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: unknown) => void;
  } = {},
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    options.onError?.(new Error("Speech synthesis not supported in this browser"));
    return;
  }

  // Clean text: remove slash markers (e.g. "내 이름은 / 김민우 / 야." -> "내 이름은 김민우 야.")
  const clean = text.replace(/\s*\/\s*/g, " ").trim();
  if (!clean) return;

  window.speechSynthesis.cancel();

  const langCode = options.lang === "zh" ? "zh-CN" : options.lang === "ko" ? "ko-KR" : "en-US";
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = langCode;
  u.rate = options.rate ?? 1.0;
  u.pitch = options.pitch ?? 1.0;

  const voice = findBestVoice(options.lang ?? "en");
  if (voice) u.voice = voice;

  u.onstart = () => options.onStart?.();
  u.onend = () => {
    activeUtterance = null;
    options.onEnd?.();
  };
  u.onerror = (e) => {
    activeUtterance = null;
    if (e.error !== "canceled" && e.error !== "interrupted") {
      options.onError?.(e);
    } else {
      options.onEnd?.();
    }
  };

  activeUtterance = u;
  window.speechSynthesis.speak(u);
}

/** Play a queue of sentences sequentially (for whole-lesson TTS playback). */
export function playSentenceQueue(
  sentences: string[],
  options: {
    lang?: "en" | "ko" | "zh" | string;
    rate?: number;
    startIndex?: number;
    onProgress?: (index: number, text: string) => void;
    onEnd?: () => void;
  } = {},
): void {
  stopSpeech();
  if (!sentences || sentences.length === 0) return;

  queue = sentences;
  queueIndex = options.startIndex ?? 0;
  queueLang = options.lang ?? "en";
  queueRate = options.rate ?? 1.0;
  onQueueProgress = options.onProgress ?? null;
  onQueueEnd = options.onEnd ?? null;

  playNextInQueue();
}

function playNextInQueue() {
  if (queueIndex >= queue.length) {
    stopSpeech();
    onQueueEnd?.();
    return;
  }

  const current = queue[queueIndex];
  onQueueProgress?.(queueIndex, current);

  speakText(current, {
    lang: queueLang,
    rate: queueRate,
    onEnd: () => {
      queueIndex++;
      playNextInQueue();
    },
    onError: () => {
      queueIndex++;
      playNextInQueue();
    },
  });
}

/** Stop all ongoing speech and clear queue. */
export function stopSpeech(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  activeUtterance = null;
  queue = [];
  queueIndex = 0;
  onQueueProgress = null;
  onQueueEnd = null;
}

export function pauseSpeech(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.pause();
}

export function resumeSpeech(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.resume();
}

export function isSpeaking(): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  return window.speechSynthesis.speaking;
}
