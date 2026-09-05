"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Block } from "@/lib/types";
import { speakText, stopSpeech, type VoiceGender } from "@/lib/speech";
import { mediaUrl } from "@/lib/media";
import { DictationPanel } from "./DictationPanel";

export interface DialogueItem {
  id: number;
  numberLabel: string;
  speaker: string;
  englishText: string;
  koreanText: string;
  clozeParts: { text: string; isBlank: boolean; answer?: string }[];
  keyPhrase?: string;
  audioSrc?: string;
}

export interface DialogueLearningViewProps {
  blocks: Block[];
  pairBlocks?: Block[] | null;
  course: string;
  lessonKey: string;
  isScript: boolean;
  voiceGender?: VoiceGender;
  audioTracks?: { src: string; label?: string }[];
}

function isEnglish(text: string): boolean {
  if (!text) return false;
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  const hangul = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;
  return latin >= hangul && latin > 0;
}

function cleanText(text: string): string {
  if (!text) return "";
  return text
    .replace(/^\s*\d+[\.\)]\s*/, "")
    .replace(/\s*\/\s*/g, " ")
    .trim();
}

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,?!;:\"'()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const COMMON_CONVERSATION_CHUNKS = [
  "nice to meet you",
  "thank you for",
  "giving me a chance to",
  "introduce myself",
  "my name is",
  "i live in",
  "i was born in",
  "i graduated from",
  "with my wife and children",
  "with my husband and",
  "i have been working for",
  "when i was in",
  "it is a pleasure to",
  "as you know",
  "how are you",
  "what do you think",
  "in my opinion",
  "would you like to",
  "could you please",
  "i am interested in",
  "let me tell you about",
];

function buildConversationCloze(enText: string): {
  parts: { text: string; isBlank: boolean; answer?: string }[];
  keyPhrase?: string;
} {
  const lower = enText.toLowerCase();
  let matchedChunk = "";

  for (const chunk of COMMON_CONVERSATION_CHUNKS) {
    if (lower.includes(chunk)) {
      matchedChunk = chunk;
      break;
    }
  }

  if (matchedChunk) {
    const idx = lower.indexOf(matchedChunk);
    const before = enText.slice(0, idx);
    const matchOriginal = enText.slice(idx, idx + matchedChunk.length);
    const after = enText.slice(idx + matchedChunk.length);

    return {
      parts: [
        { text: before, isBlank: false },
        { text: matchOriginal, isBlank: true, answer: matchOriginal },
        { text: after, isBlank: false },
      ].filter((p) => p.text.length > 0),
      keyPhrase: matchOriginal,
    };
  }

  // Fallback: blank out 2nd and 3rd word
  const words = enText.split(/(\s+)/);
  if (words.length >= 3) {
    const targetIdx = 2; // word
    return {
      parts: words.map((w, i) => ({
        text: w,
        isBlank: i === targetIdx && /^[A-Za-z]+$/.test(w),
        answer: i === targetIdx ? w : undefined,
      })),
      keyPhrase: words[targetIdx],
    };
  }

  return {
    parts: [{ text: enText, isBlank: false }],
  };
}

export function DialogueLearningView({
  blocks,
  pairBlocks = null,
  course,
  lessonKey,
  isScript,
  voiceGender = "neutral",
  audioTracks = [],
}: DialogueLearningViewProps) {
  // Determine if this is a Male or Female course
  const isMale =
    voiceGender === "male" ||
    course === "man" ||
    course === "adults-m" ||
    course === "middle" ||
    lessonKey.includes("am");
  const speakerName = isMale ? "남성 성우 (Male Voice)" : "여성 성우 (Female Voice)";
  const speakerAvatar = isMale ? "👨" : "👩";
  const effectiveGender: VoiceGender = isMale ? "male" : "female";
  const defaultPitch = isMale ? 0.82 : 1.15;

  // Extract Dialogue Sentences
  const items = useMemo<DialogueItem[]>(() => {
    // 1. Sentences block
    const sents = blocks
      .filter((b) => b.type === "sentences")
      .flatMap((b) => (b as { type: "sentences"; items: { n: string; text: string }[] }).items);
    if (sents.length > 0) {
      return sents.map((s, idx) => {
        const en = cleanText(s.text);
        const { parts, keyPhrase } = buildConversationCloze(en);
        const clipTrack = audioTracks[idx + 1] || audioTracks[idx];
        return {
          id: idx + 1,
          numberLabel: s.n || String(idx + 1),
          speaker: speakerName,
          englishText: en,
          koreanText: "",
          clozeParts: parts,
          keyPhrase,
          audioSrc: clipTrack?.src,
        };
      });
    }

    // 2. Paragraphs (man, woman dialogue courses)
    const paras = blocks.filter((b) => b.type === "paragraph") as { type: "paragraph"; text: string; lang?: string }[];
    const cleanParas: { text: string; isEn: boolean }[] = [];

    for (const p of paras) {
      const t = (p.text || "").trim();
      if (!t || t.includes("K-IG") || t.includes("<font") || t.includes("한/영") || /^Chapter\s+\d/i.test(t)) continue;
      if (/\s*:\s*$/.test(t) || /^\d+\s+[A-Za-z]/.test(t)) continue;
      if (
        t.toLowerCase().includes("self-introduction") ||
        t.toLowerCase().includes("educational background") ||
        t.toLowerCase().includes("politics in korea")
      ) {
        if (t.length < 50) continue;
      }
      cleanParas.push({ text: cleanText(t), isEn: isEnglish(t) });
    }

    // Alternating matching
    const altPairs: { en: string; ko: string }[] = [];
    let i = 0;
    while (i < cleanParas.length - 1) {
      const curr = cleanParas[i];
      const next = cleanParas[i + 1];
      if (curr.isEn !== next.isEn) {
        altPairs.push({
          en: curr.isEn ? curr.text : next.text,
          ko: curr.isEn ? next.text : curr.text,
        });
        i += 2;
      } else {
        break;
      }
    }

    if (altPairs.length > 0 && i >= cleanParas.length - 2) {
      return altPairs.map((pair, idx) => {
        const { parts, keyPhrase } = buildConversationCloze(pair.en);
        const clipTrack = audioTracks[idx + 1] || audioTracks[idx];
        return {
          id: idx + 1,
          numberLabel: String(idx + 1),
          speaker: speakerName,
          englishText: pair.en,
          koreanText: pair.ko,
          clozeParts: parts,
          keyPhrase,
          audioSrc: clipTrack?.src,
        };
      });
    }

    // Group matching
    const enList = cleanParas.filter((p) => p.isEn);
    const koList = cleanParas.filter((p) => !p.isEn);
    const len = Math.max(enList.length, koList.length);
    const result: DialogueItem[] = [];

    for (let j = 0; j < len; j++) {
      const en = enList[j]?.text || "";
      const ko = koList[j]?.text || "";
      const { parts, keyPhrase } = buildConversationCloze(en);
      const clipTrack = audioTracks[j + 1] || audioTracks[j];
      result.push({
        id: j + 1,
        numberLabel: String(j + 1),
        speaker: speakerName,
        englishText: en,
        koreanText: ko,
        clozeParts: parts,
        keyPhrase,
        audioSrc: clipTrack?.src,
      });
    }

    if (result.length > 0) return result;

    // 3. Fallback for instructions/hints (adults-m/adults-w)
    const instrs = blocks.filter((b) => b.type === "instruction" || b.type === "hints") as { type: "instruction" | "hints"; text: string }[];
    const validInstrs = instrs
      .map((b) => cleanText(b.text))
      .filter((t) => t && !t.includes("Principle") && !t.includes("Chapter") && !t.includes("K-IG"));

    return validInstrs.map((t, idx) => {
      const en = isEnglish(t) ? t : "";
      const ko = isEnglish(t) ? "" : t;
      const { parts, keyPhrase } = buildConversationCloze(en || t);
      const clipTrack = audioTracks[idx + 1] || audioTracks[idx];
      return {
        id: idx + 1,
        numberLabel: String(idx + 1),
        speaker: speakerName,
        englishText: en || t,
        koreanText: ko,
        clozeParts: parts,
        keyPhrase,
        audioSrc: clipTrack?.src,
      };
    });
  }, [blocks, course, speakerName, audioTracks]);

  // Choice & Dictation blocks
  const choice = blocks.find((b) => b.type === "choice") || pairBlocks?.find((b) => b.type === "choice");
  const dictation = blocks.find((b) => b.type === "dictation") || pairBlocks?.find((b) => b.type === "dictation");
  const referenceSentences = items.map((it) => it.englishText).filter(Boolean);

  // View & Study States
  const [studyMode, setStudyMode] = useState<"shadowing" | "continuous" | "speaking" | "cloze">("shadowing");
  const [activeRecallMode, setActiveRecallMode] = useState<"bilingual" | "hideEnglish" | "hideKorean">("bilingual");
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("normal");
  const [audioSpeed, setAudioSpeed] = useState<0.85 | 1.0>(1.0);

  // Step-by-Step Shadowing Progress (0: Not started, 1: Listened, 2: Shadowed, 3: Mastered)
  const [shadowingSteps, setShadowingSteps] = useState<Record<number, number>>({});
  const [speakingInputs, setSpeakingInputs] = useState<Record<number, string>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [clozeInputs, setClozeInputs] = useState<Record<number, string>>({});
  const [fluencyGrades, setFluencyGrades] = useState<Record<number, boolean>>({});

  // Continuous Autoplay State
  const [continuousPlaying, setContinuousPlaying] = useState(false);
  const [continuousIndex, setContinuousIndex] = useState(0);
  const [activeSpeakingId, setActiveSpeakingId] = useState<number | null>(null);

  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const storageKey = `kig:dialogue:work:${lessonKey}`;

  // Restore state
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.shadowingSteps) setShadowingSteps(data.shadowingSteps);
        if (data.speakingInputs) setSpeakingInputs(data.speakingInputs);
        if (data.revealedAnswers) setRevealedAnswers(data.revealedAnswers);
        if (data.clozeInputs) setClozeInputs(data.clozeInputs);
        if (data.fluencyGrades) setFluencyGrades(data.fluencyGrades);
        if (data.at) setSavedAt(data.at);
      }
    } catch {
      // ignore
    }
    setRestored(true);
  }, [storageKey]);

  // Auto-save state
  useEffect(() => {
    if (!restored) return;
    const timer = setTimeout(() => {
      try {
        const at = new Date().toLocaleTimeString();
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            shadowingSteps,
            speakingInputs,
            revealedAnswers,
            clozeInputs,
            fluencyGrades,
            at,
          })
        );
        setSavedAt(at);
      } catch {
        // ignore
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [shadowingSteps, speakingInputs, revealedAnswers, clozeInputs, fluencyGrades, storageKey, restored]);

  // Clean speech when unmounting
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  // Audio Playback
  function playAudioSnippet(text: string, id: number, audioSrc?: string, onComplete?: () => void) {
    if (!text) return;
    stopSpeech();
    setActiveSpeakingId(id);

    // If audio file exists, try playing it, otherwise fallback to speech synthesis
    if (audioSrc) {
      const audio = new Audio(mediaUrl(audioSrc));
      audio.playbackRate = audioSpeed;
      audio.onended = () => {
        setActiveSpeakingId(null);
        onComplete?.();
      };
      audio.onerror = () => {
        playWithTts(text, id, onComplete);
      };
      audio.play().catch(() => {
        playWithTts(text, id, onComplete);
      });
    } else {
      playWithTts(text, id, onComplete);
    }
  }

  function playWithTts(text: string, id: number, onComplete?: () => void) {
    speakText(text, {
      lang: "en",
      gender: effectiveGender,
      rate: audioSpeed,
      pitch: defaultPitch,
      onStart: () => setActiveSpeakingId(id),
      onEnd: () => {
        setActiveSpeakingId(null);
        onComplete?.();
      },
      onError: () => {
        setActiveSpeakingId(null);
        onComplete?.();
      },
    });
  }

  function playKoreanSnippet(text: string) {
    if (!text) return;
    stopSpeech();
    speakText(text, {
      lang: "ko",
      gender: effectiveGender,
      rate: 0.95,
      pitch: defaultPitch,
    });
  }

  // 3-Step Shadowing Progression Handler
  function advanceShadowingStep(id: number, text: string, audioSrc?: string) {
    const currentStep = shadowingSteps[id] || 0;
    const nextStep = Math.min(currentStep + 1, 3);
    setShadowingSteps((prev) => ({ ...prev, [id]: nextStep }));
    playAudioSnippet(text, id, audioSrc);
  }

  function resetShadowingStep(id: number) {
    setShadowingSteps((prev) => ({ ...prev, [id]: 0 }));
  }

  // Continuous Autoplay Engine
  function startContinuousPlay(startIndex = 0) {
    if (items.length === 0) return;
    setContinuousPlaying(true);
    playContinuousFrom(startIndex);
  }

  function stopContinuousPlay() {
    stopSpeech();
    setContinuousPlaying(false);
    setActiveSpeakingId(null);
  }

  function playContinuousFrom(index: number) {
    if (index >= items.length) {
      setContinuousPlaying(false);
      setActiveSpeakingId(null);
      setContinuousIndex(0);
      return;
    }

    setContinuousIndex(index);
    const item = items[index];
    playAudioSnippet(item.englishText, item.id, item.audioSrc, () => {
      // Short natural pause between lines (700ms)
      setTimeout(() => {
        playContinuousFrom(index + 1);
      }, 700);
    });
  }

  // Metrics
  const totalCount = items.length;
  const masteredCount = items.filter((it) => (shadowingSteps[it.id] || 0) >= 3).length;
  const fluencyCount = items.filter((it) => fluencyGrades[it.id] === true).length;
  const progressPercent = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

  // Typography Scaling
  const fontStyles = {
    normal: {
      english: "text-[16.5px] leading-[1.65]",
      korean: "text-[15px] leading-[1.6]",
      input: "text-[15px]",
    },
    large: {
      english: "text-[18.5px] leading-[1.75]",
      korean: "text-[16.5px] leading-[1.7]",
      input: "text-[16.5px]",
    },
    xlarge: {
      english: "text-[21px] leading-[1.85]",
      korean: "text-[18px] leading-[1.8]",
      input: "text-[18px]",
    },
  }[fontSize];

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Header Toolbar & Profile Card */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface/90 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-[20px]">
              {speakerAvatar}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink text-[15px]">
                  {isMale ? "MEN 실전 회화 & 스피킹" : "WOMEN 실전 회화 & 스피킹"}
                </span>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[10.5px] font-semibold " +
                    (isMale
                      ? "bg-blue-500/15 text-blue-700 border border-blue-500/30"
                      : "bg-rose-500/15 text-rose-700 border border-rose-500/30")
                  }
                >
                  {isMale ? "🎙️ 원본 오디오 재생 (남성 성우 트랙)" : "🎙️ 원본 오디오 재생 (여성 성우 트랙)"}
                </span>
              </div>
              <p className="text-[12px] text-ink-soft mt-0.5">
                화자: <span className="font-medium text-ink">{speakerName}</span> · 총 {totalCount}개 발화 문장
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {savedAt && (
              <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] text-ink-faint">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{savedAt} 저장됨</span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-xl bg-raised/80 px-3 py-1.5 border border-line">
              <span className="text-[11.5px] font-medium text-ink-soft">스피킹 마스터:</span>
              <span className="font-bold text-primary text-[14px]">
                {masteredCount} / {totalCount}
              </span>
              <span className="text-[11px] text-ink-faint">({progressPercent}%)</span>
            </div>
          </div>
        </div>

        {/* Study Mode Selector & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-raised/80 p-1 border border-line/70">
            <button
              type="button"
              onClick={() => setStudyMode("shadowing")}
              className={
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all cursor-pointer " +
                (studyMode === "shadowing"
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink hover:bg-surface/50")
              }
            >
              <span>🗣️</span>
              <span>3단계 섀도잉</span>
            </button>

            <button
              type="button"
              onClick={() => setStudyMode("continuous")}
              className={
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all cursor-pointer " +
                (studyMode === "continuous"
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink hover:bg-surface/50")
              }
            >
              <span>💬</span>
              <span>연속 대화 오토플레이</span>
            </button>

            <button
              type="button"
              onClick={() => setStudyMode("speaking")}
              className={
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all cursor-pointer " +
                (studyMode === "speaking"
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink hover:bg-surface/50")
              }
            >
              <span>✍️</span>
              <span>스피킹 역번역</span>
            </button>

            <button
              type="button"
              onClick={() => setStudyMode("cloze")}
              className={
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all cursor-pointer " +
                (studyMode === "cloze"
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink hover:bg-surface/50")
              }
            >
              <span>🧩</span>
              <span>핵심 표현 퀴즈</span>
            </button>
          </div>

          {/* Audio & Font Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-line/70 bg-raised/50 p-0.5 text-[11px] font-mono text-ink-soft">
              <button
                type="button"
                onClick={() => setAudioSpeed(1.0)}
                className={`px-2 py-0.5 rounded cursor-pointer ${audioSpeed === 1.0 ? "bg-surface text-ink font-semibold shadow-2xs" : ""}`}
                title="1.0x 표준 배속"
              >
                1.0x
              </button>
              <button
                type="button"
                onClick={() => setAudioSpeed(0.85)}
                className={`px-2 py-0.5 rounded cursor-pointer ${audioSpeed === 0.85 ? "bg-surface text-ink font-semibold shadow-2xs" : ""}`}
                title="0.85x 천천히 듣기"
              >
                0.85x
              </button>
            </div>

            <div className="flex items-center rounded-lg border border-line/70 bg-raised/50 p-0.5 text-[11px] font-mono text-ink-soft">
              <button
                type="button"
                onClick={() => setFontSize("normal")}
                className={`px-2 py-0.5 rounded cursor-pointer ${fontSize === "normal" ? "bg-surface text-ink font-semibold shadow-2xs" : ""}`}
              >
                기본
              </button>
              <button
                type="button"
                onClick={() => setFontSize("large")}
                className={`px-2 py-0.5 rounded cursor-pointer ${fontSize === "large" ? "bg-surface text-ink font-semibold shadow-2xs" : ""}`}
              >
                크게
              </button>
              <button
                type="button"
                onClick={() => setFontSize("xlarge")}
                className={`px-2 py-0.5 rounded cursor-pointer ${fontSize === "xlarge" ? "bg-surface text-ink font-semibold shadow-2xs" : ""}`}
              >
                특대
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: 🗣️ 3단계 실전 섀도잉 (Role-Playing & 3-Step Shadowing) */}
      {/* ========================================================================= */}
      {studyMode === "shadowing" && (
        <div className="flex flex-col gap-6">
          {/* Instructions & Recall Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 shadow-2xs">
            <div className="text-[13px] text-ink-soft">
              <span className="font-semibold text-ink">💡 3단계 스피킹 마스터법:</span> [1단계 듣기]로 발음과
              억양을 파악하고, [2단계 따라하기]로 동시에 섀도잉한 뒤, [3단계 스스로 말하기]로 온전히 입에 익히세요.
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-line bg-raised/60 p-0.5 text-[12px] font-medium">
              <button
                type="button"
                onClick={() => setActiveRecallMode("bilingual")}
                className={`px-2.5 py-1 rounded cursor-pointer ${activeRecallMode === "bilingual" ? "bg-surface text-ink font-semibold shadow-2xs" : "text-ink-soft hover:text-ink"}`}
              >
                한/영 대조
              </button>
              <button
                type="button"
                onClick={() => setActiveRecallMode("hideEnglish")}
                className={`px-2.5 py-1 rounded cursor-pointer ${activeRecallMode === "hideEnglish" ? "bg-surface text-ink font-semibold shadow-2xs" : "text-ink-soft hover:text-ink"}`}
              >
                영어 숨김 (스피킹)
              </button>
              <button
                type="button"
                onClick={() => setActiveRecallMode("hideKorean")}
                className={`px-2.5 py-1 rounded cursor-pointer ${activeRecallMode === "hideKorean" ? "bg-surface text-ink font-semibold shadow-2xs" : "text-ink-soft hover:text-ink"}`}
              >
                한글 숨김 (듣기)
              </button>
            </div>
          </div>

          {/* Dialogue Sentences List */}
          <div className="flex flex-col gap-4">
            {items.map((item) => {
              const step = shadowingSteps[item.id] || 0;
              const isSpeaking = activeSpeakingId === item.id;
              const isRevealed = revealedAnswers[item.id] === true;

              return (
                <div
                  key={item.id}
                  className={
                    "flex flex-col gap-3 rounded-2xl border p-5 transition-all shadow-2xs " +
                    (isSpeaking
                      ? "border-primary bg-primary/[0.03] ring-1 ring-primary/40 shadow-xs"
                      : step >= 3
                      ? "border-emerald-500/50 bg-emerald-500/[0.02]"
                      : "border-line bg-surface")
                  }
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-raised font-mono text-[11.5px] font-bold text-ink">
                        {item.numberLabel}
                      </span>
                      <span className="text-[12px] font-medium text-ink-soft">
                        {item.speaker}
                      </span>
                      {step >= 3 && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          ✓ 스피킹 마스터!
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.koreanText && (
                        <button
                          type="button"
                          onClick={() => playKoreanSnippet(item.koreanText)}
                          className="rounded-md border border-line px-2 py-1 text-[11.5px] text-ink-soft hover:bg-raised transition-colors cursor-pointer"
                          title="우리말 음성 듣기"
                        >
                          🔊 우리말
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => playAudioSnippet(item.englishText, item.id, item.audioSrc)}
                        className={
                          "flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11.5px] font-medium transition-all cursor-pointer " +
                          (isSpeaking
                            ? "border-primary bg-primary text-surface font-semibold shadow-xs"
                            : "border-line text-ink-soft hover:bg-raised hover:text-ink")
                        }
                      >
                        <span>🔊</span>
                        <span>{isMale ? "남성 원어민 발음" : "여성 원어민 발음"}</span>
                      </button>
                    </div>
                  </div>

                  {/* English Sentence Display */}
                  <div className="flex flex-col gap-1.5">
                    {activeRecallMode === "hideEnglish" && !isRevealed ? (
                      <div
                        onClick={() => setRevealedAnswers((p) => ({ ...p, [item.id]: true }))}
                        className="rounded-xl border border-dashed border-line bg-raised/40 p-4 text-center text-[13.5px] text-ink-faint hover:text-ink cursor-pointer transition-colors"
                      >
                        🔍 영문 가림 상태 (클릭하여 확인하거나 스스로 말해보세요)
                      </div>
                    ) : (
                      <p className={`font-semibold text-ink tracking-tight ${fontStyles.english}`}>
                        {item.englishText}
                      </p>
                    )}

                    {/* Korean Translation */}
                    {item.koreanText && activeRecallMode !== "hideKorean" && (
                      <p className={`text-ink-soft border-t border-line/40 pt-2 ${fontStyles.korean}`}>
                        {item.koreanText}
                      </p>
                    )}
                  </div>

                  {/* 3-Step Shadowing Progression Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line/50">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => advanceShadowingStep(item.id, item.englishText, item.audioSrc)}
                        className={
                          "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-all cursor-pointer " +
                          (step === 0
                            ? "border-primary bg-primary text-surface shadow-xs"
                            : step === 1
                            ? "border-blue-500 bg-blue-500 text-surface shadow-xs"
                            : step === 2
                            ? "border-amber-500 bg-amber-500 text-surface shadow-xs"
                            : "border-emerald-500 bg-emerald-500 text-surface shadow-xs")
                        }
                      >
                        <span>
                          {step === 0
                            ? "🎧 1단계: 집중 듣기"
                            : step === 1
                            ? "🗣️ 2단계: 따라하기 (Shadowing)"
                            : step === 2
                            ? "🎤 3단계: 스스로 말하기"
                            : "✓ 3단계 마스터 완료! (다시 연습)"}
                        </span>
                      </button>

                      {step > 0 && (
                        <button
                          type="button"
                          onClick={() => resetShadowingStep(item.id)}
                          className="text-[11.5px] text-ink-faint hover:text-ink px-1.5 py-1 transition-colors cursor-pointer"
                          title="단계 초기화"
                        >
                          ↺ 초기화
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 font-mono text-[11px] text-ink-faint">
                      <span className={`h-2 w-2 rounded-full ${step >= 1 ? "bg-primary" : "bg-raised border border-line"}`} />
                      <span className={`h-2 w-2 rounded-full ${step >= 2 ? "bg-primary" : "bg-raised border border-line"}`} />
                      <span className={`h-2 w-2 rounded-full ${step >= 3 ? "bg-emerald-500" : "bg-raised border border-line"}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: 💬 연속 대화 흐름 & 오토플레이 (Continuous Dialogue Flow) */}
      {/* ========================================================================= */}
      {studyMode === "continuous" && (
        <div className="flex flex-col gap-6">
          {/* Autoplay Control Bar */}
          <div className="sticky top-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 p-4 shadow-md backdrop-blur-md">
            <div className="flex items-center gap-2">
              {continuousPlaying ? (
                <button
                  type="button"
                  onClick={stopContinuousPlay}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-[13px] font-bold text-white shadow-xs hover:opacity-90 transition-all cursor-pointer"
                >
                  <span>⏸</span>
                  <span>일시정지</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startContinuousPlay(continuousIndex)}
                  className="flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-[13px] font-bold text-surface shadow-xs hover:opacity-90 transition-all cursor-pointer"
                >
                  <span>▶</span>
                  <span>연속 자동 재생 시작</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => startContinuousPlay(0)}
                className="rounded-xl border border-line bg-raised px-3 py-2 text-[12.5px] font-medium text-ink hover:bg-raised/80 transition-colors cursor-pointer"
              >
                ↺ 처음부터
              </button>
            </div>

            <div className="flex items-center gap-2 text-[12.5px] text-ink-soft">
              <span>진행 중:</span>
              <span className="font-bold text-primary font-mono">
                {continuousPlaying ? continuousIndex + 1 : "-"}/{totalCount}
              </span>
            </div>
          </div>

          {/* Continuous Script Sheet */}
          <div className="flex flex-col divide-y divide-line/60 rounded-2xl border border-line bg-surface shadow-2xs overflow-hidden">
            {items.map((item, idx) => {
              const isCurrent = activeSpeakingId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => playAudioSnippet(item.englishText, item.id, item.audioSrc)}
                  className={
                    "flex flex-col gap-2 p-5 transition-all cursor-pointer " +
                    (isCurrent
                      ? "bg-primary/[0.06] border-l-4 border-l-primary"
                      : "hover:bg-raised/40")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] font-bold text-ink-faint">
                        #{item.numberLabel}
                      </span>
                      <span className="text-[12px] font-semibold text-ink-soft">
                        {item.speaker}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="text-[12px] text-ink-soft hover:text-primary transition-colors"
                      title="이 문장 듣기"
                    >
                      🔊
                    </button>
                  </div>

                  <p className={`font-semibold text-ink ${fontStyles.english}`}>
                    {item.englishText}
                  </p>

                  {item.koreanText && (
                    <p className={`text-ink-soft text-[14px]`}>
                      {item.koreanText}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: ✍️ 스피킹 역번역 영작 훈련 (Back-Translation Speaking Drill) */}
      {/* ========================================================================= */}
      {studyMode === "speaking" && (
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-line bg-surface p-4 text-[13px] text-ink-soft leading-relaxed shadow-2xs">
            <span className="font-semibold text-ink">✍️ 스피킹 역번역 훈련:</span> 우리말 대화 내용을 보고, 머릿속으로
            영어 문장을 떠올려 직접 타이핑하거나 큰 소리로 말해보세요. [💡 모범 표현 확인]을 누르면 원어민의 실제 표현과
            일치 여부를 비교할 수 있습니다.
          </div>

          <div className="flex flex-col gap-4">
            {items.map((item) => {
              const userVal = speakingInputs[item.id] || "";
              const isRevealed = revealedAnswers[item.id] === true;
              const grade = fluencyGrades[item.id];
              const isExact =
                userVal.trim().length > 0 &&
                normalizeForComparison(userVal) === normalizeForComparison(item.englishText);

              return (
                <div
                  key={item.id}
                  className={
                    "flex flex-col gap-3 rounded-2xl border p-5 transition-all shadow-2xs " +
                    (grade === true
                      ? "border-emerald-500/50 bg-emerald-500/[0.02]"
                      : grade === false
                      ? "border-amber-500/50 bg-amber-500/[0.02]"
                      : "border-line bg-surface")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-raised font-mono text-[11.5px] font-bold text-ink">
                      {item.numberLabel}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isExact && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          🎯 원문 완벽 일치!
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => playAudioSnippet(item.englishText, item.id, item.audioSrc)}
                        className="rounded-md border border-line px-2.5 py-1 text-[11.5px] text-ink-soft hover:bg-raised transition-colors cursor-pointer"
                      >
                        🔊 영어 발음
                      </button>
                    </div>
                  </div>

                  {/* Korean Prompt */}
                  <div className="rounded-xl bg-raised/50 p-3.5 border border-line/60">
                    <p className={`font-semibold text-ink ${fontStyles.korean}`}>
                      {item.koreanText || item.englishText}
                    </p>
                  </div>

                  {/* Student Input */}
                  <input
                    type="text"
                    value={userVal}
                    onChange={(e) =>
                      setSpeakingInputs((p) => ({ ...p, [item.id]: e.target.value }))
                    }
                    placeholder="머릿속에 떠오른 영어 표현을 작성해보세요... (스피킹 연습)"
                    className={`w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink transition-all ${fontStyles.input}`}
                  />

                  {/* Actions & Self Grading */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-line/50">
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedAnswers((p) => ({ ...p, [item.id]: !p[item.id] }))
                      }
                      className="rounded-lg border border-line bg-raised/60 px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-raised transition-colors cursor-pointer"
                    >
                      {isRevealed ? "🔒 모범 표현 가리기" : "💡 모범 표현 확인"}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11.5px] text-ink-faint mr-1">스피킹 자가 진단:</span>
                      <button
                        type="button"
                        onClick={() =>
                          setFluencyGrades((p) => ({ ...p, [item.id]: p[item.id] === true ? undefined : true } as any))
                        }
                        className={
                          "rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-all cursor-pointer " +
                          (grade === true
                            ? "border-emerald-500 bg-emerald-500 text-surface font-semibold"
                            : "border-line bg-surface text-ink-soft hover:border-emerald-500/50 hover:text-emerald-600")
                        }
                      >
                        ✓ 유창함
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFluencyGrades((p) => ({ ...p, [item.id]: p[item.id] === false ? undefined : false } as any))
                        }
                        className={
                          "rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-all cursor-pointer " +
                          (grade === false
                            ? "border-amber-500 bg-amber-500 text-surface font-semibold"
                            : "border-line bg-surface text-ink-soft hover:border-amber-500/50 hover:text-amber-600")
                        }
                      >
                        ↺ 버벅임
                      </button>
                    </div>
                  </div>

                  {/* Revealed Answer */}
                  {isRevealed && (
                    <div className="mt-1 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-3.5">
                      <span className="block font-mono text-[11px] font-bold text-emerald-700 uppercase">
                        모범 영어 회화 표현
                      </span>
                      <p className={`mt-1 font-semibold text-emerald-900 ${fontStyles.english}`}>
                        {item.englishText}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 4: 🧩 핵심 회화 표현 빈칸 퀴즈 (Spoken Expression Cloze) */}
      {/* ========================================================================= */}
      {studyMode === "cloze" && (
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-line bg-surface p-4 text-[13px] text-ink-soft leading-relaxed shadow-2xs">
            <span className="font-semibold text-ink">💡 핵심 회화 청크 퀴즈:</span> 원어민 대화에서 가장 자주 쓰이는
            관용적 표현과 구문 덩어리가 빈칸으로 출제됩니다. 빈칸을 채우며 유창한 회화 패턴을 익히세요.
          </div>

          <div className="flex flex-col gap-4">
            {items.map((item) => {
              const isRevealed = revealedAnswers[item.id] === true;
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-raised font-mono text-[11.5px] font-bold text-ink">
                      {item.numberLabel}
                    </span>

                    <button
                      type="button"
                      onClick={() => playAudioSnippet(item.englishText, item.id, item.audioSrc)}
                      className="rounded-md border border-line px-2.5 py-1 text-[11.5px] text-ink-soft hover:bg-raised transition-colors cursor-pointer"
                    >
                      🔊 전체 문장 듣기
                    </button>
                  </div>

                  {item.koreanText && (
                    <p className="text-[14px] text-ink-soft font-medium">
                      {item.koreanText}
                    </p>
                  )}

                  {/* Cloze Sentence */}
                  <div className="rounded-xl border border-line/80 bg-raised/30 p-4">
                    <div className={`flex flex-wrap items-center gap-1.5 text-ink ${fontStyles.english}`}>
                      {item.clozeParts.map((part, pIdx) => {
                        if (!part.isBlank) {
                          return <span key={pIdx}>{part.text}</span>;
                        }

                        if (isRevealed) {
                          return (
                            <span
                              key={pIdx}
                              className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-800 border border-emerald-500/40"
                            >
                              {part.answer}
                            </span>
                          );
                        }

                        return (
                          <span
                            key={pIdx}
                            className="rounded-md border border-line border-dashed bg-surface px-3 py-1 font-mono text-sm font-semibold text-primary"
                          >
                            [ 빈칸: {part.answer?.length}글자 ]
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[12px] text-ink-faint">
                      {item.keyPhrase ? `핵심 어휘/구문: ${item.keyPhrase}` : ""}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setRevealedAnswers((p) => ({ ...p, [item.id]: !p[item.id] }))
                      }
                      className="rounded-lg border border-line bg-raised/60 px-3 py-1 text-[12px] font-medium text-ink hover:bg-raised transition-colors cursor-pointer"
                    >
                      {isRevealed ? "🔒 빈칸 가리기" : "💡 빈칸 정답 확인"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Legacy Dictation and Verification Panel if applicable */}
      {choice || dictation ? (
        <DictationPanel
          options={choice?.type === "choice" ? choice.options : null}
          rows={dictation?.type === "dictation" ? dictation.rows : null}
          storageKey={lessonKey}
          referenceSentences={referenceSentences}
        />
      ) : null}
    </div>
  );
}
