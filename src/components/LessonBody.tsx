"use client";

import { useState } from "react";
import type { Block } from "@/lib/types";
import { useLanguage } from "./LanguageProvider";
import { DictationPanel } from "./DictationPanel";
import { LdLearningView } from "./LdLearningView";
import { ReadingLearningView } from "./ReadingLearningView";
import { GrammarLearningView } from "./GrammarLearningView";
import { DialogueLearningView } from "./DialogueLearningView";
import { PhonicsLearningView } from "./PhonicsLearningView";
import { StudentLearningView } from "./StudentLearningView";
import { BasicsLearningView } from "./BasicsLearningView";
import { CnnLearningView } from "./CnnLearningView";
import { ChineseLearningView } from "./ChineseLearningView";
import { speakText, type VoiceGender } from "@/lib/speech";
import { mediaUrl } from "@/lib/media";

export interface PairedSentence {
  index: number;
  numberLabel: string;
  targetText: string;     // Usually English (or Chinese in chinese course)
  translationText: string; // Usually Korean
  audioSrc?: string;
}

/**
 * Intelligent Educational Lesson Body.
 *
 * Automatically aligns English drills with their paired Korean scripts, enables
 * sentence-by-sentence audio playback, active recall toggles, phonics word pronunciation,
 * and dictation verification.
 *
 * Dedicated male voice for MEN courses and female voice for WOMEN courses.
 */
export function LessonBody({
  blocks,
  pairBlocks = null,
  course,
  lessonKey,
  isScript = false,
  contentLang = "en",
  voiceGender = "neutral",
  audioTracks = [],
  chunkDrills = [],
}: {
  blocks: Block[];
  pairBlocks?: Block[] | null;
  course: string;
  lessonKey: string;
  isScript?: boolean;
  contentLang?: string;
  voiceGender?: VoiceGender;
  audioTracks?: { src: string; label?: string }[];
  chunkDrills?: { en: string; ko: string }[];
}) {
  const { t } = useLanguage();

  // Dedicated pedagogical learning view for Listen & Dictate course
  if (course === "ld") {
    return (
      <LdLearningView
        blocks={blocks}
        pairBlocks={pairBlocks}
        lessonKey={lessonKey}
        isScript={isScript}
        audioTracks={audioTracks}
      />
    );
  }

  // Dedicated authentic reading comprehension system for Reading course
  if (course === "reading") {
    return (
      <ReadingLearningView
        blocks={blocks}
        pairBlocks={pairBlocks}
        lessonKey={lessonKey}
        isScript={isScript}
        audioTracks={audioTracks}
      />
    );
  }

  // Dedicated grammar & composition learning system for Grammar 1 & 2 courses
  if (course === "grammar1" || course === "grammar2") {
    return (
      <GrammarLearningView
        blocks={blocks}
        pairBlocks={pairBlocks}
        course={course}
        lessonKey={lessonKey}
        isScript={isScript}
        audioTracks={audioTracks}
      />
    );
  }

  // Dedicated authentic spoken dialogue & conversation learning system for MEN & WOMEN courses
  if (["man", "woman", "adults-m", "adults-w", "adults"].includes(course)) {
    return (
      <DialogueLearningView
        blocks={blocks}
        pairBlocks={pairBlocks}
        course={course}
        lessonKey={lessonKey}
        isScript={isScript}
        voiceGender={voiceGender}
        audioTracks={audioTracks}
      />
    );
  }

  // Dedicated Phonics Word Matrix for VOCA course
  if (course === "phonics") {
    return <PhonicsLearningView blocks={blocks} lessonKey={lessonKey} />;
  }

  // Dedicated Student Conversation & Chunk Drill view for student course
  if (course === "student") {
    return (
      <StudentLearningView
        blocks={blocks}
        lessonKey={lessonKey}
        audioTracks={audioTracks}
        chunkDrills={chunkDrills}
      />
    );
  }

  // Dedicated Slashed Sentence & Spoken Q/A view for basics and middle courses
  if (course === "basics" || course === "middle") {
    return (
      <BasicsLearningView
        blocks={blocks}
        pairBlocks={pairBlocks}
        course={course}
        lessonKey={lessonKey}
        isScript={isScript}
        audioTracks={audioTracks}
      />
    );
  }

  // Dedicated Broadcast News Reader for CNN course
  if (course === "cnn") {
    return <CnnLearningView blocks={blocks} lessonKey={lessonKey} />;
  }

  // Dedicated Chinese Pinyin & Spoken Conversation view for chinese course
  if (course === "chinese") {
    return (
      <ChineseLearningView
        blocks={blocks}
        lessonKey={lessonKey}
        audioTracks={audioTracks}
      />
    );
  }

  // Learning modes: 'bilingual' (대조), 'englishOnly' (영어집중), 'koreanOnly' (영작훈련)
  const [studyMode, setStudyMode] = useState<"bilingual" | "englishOnly" | "koreanOnly">("bilingual");
  const [revealedItems, setRevealedItems] = useState<Record<number, boolean>>({});
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);

  // Extract choices & dictation
  const choice = blocks.find((b) => b.type === "choice") || pairBlocks?.find((b) => b.type === "choice");
  const dictation = blocks.find((b) => b.type === "dictation") || pairBlocks?.find((b) => b.type === "dictation");

  // Pair sentences between main lesson and paired script
  const pairedSentences = buildPairedSentences(blocks, pairBlocks, course, isScript, audioTracks, lessonKey);

  // Collect all target language sentences for dictation answer checking
  const referenceSentences = pairedSentences.map((s) => s.targetText).filter(Boolean);

  function toggleReveal(idx: number) {
    setRevealedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  function playSentence(text: string, idx: number, audioSrc?: string) {
    if (!text) return;
    setActiveSentenceIndex(idx);

    if (audioSrc) {
      const audio = new Audio(mediaUrl(audioSrc));
      audio.onended = () => setActiveSentenceIndex(null);
      audio.onerror = () => {
        speakSentenceTts(text, idx);
      };
      audio.play().catch(() => speakSentenceTts(text, idx));
    } else {
      speakSentenceTts(text, idx);
    }
  }

  function speakSentenceTts(text: string, idx: number) {
    speakText(text, {
      lang: contentLang,
      gender: voiceGender,
      rate: 0.95,
      onStart: () => setActiveSentenceIndex(idx),
      onEnd: () => setActiveSentenceIndex(null),
      onError: () => setActiveSentenceIndex(null),
    });
  }

  function playWord(word: string) {
    speakText(word, {
      lang: contentLang,
      gender: voiceGender,
      rate: 0.9,
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Interactive Study Mode Selector (대조 학습 모드 전환기) */}
      {pairedSentences.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-raised/50 p-2.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink-soft">
            <span className="font-mono text-[11px] text-ink-faint uppercase">모드:</span>
            <button
              type="button"
              onClick={() => setStudyMode("bilingual")}
              className={
                "rounded px-2.5 py-1 transition-all " +
                (studyMode === "bilingual"
                  ? "bg-ink text-surface font-medium shadow-xs"
                  : "text-ink-soft hover:bg-surface hover:text-ink")
              }
            >
              {t("mode.bilingual")}
            </button>
            <button
              type="button"
              onClick={() => setStudyMode("englishOnly")}
              className={
                "rounded px-2.5 py-1 transition-all " +
                (studyMode === "englishOnly"
                  ? "bg-ink text-surface font-medium shadow-xs"
                  : "text-ink-soft hover:bg-surface hover:text-ink")
              }
            >
              {t("mode.englishOnly")}
            </button>
            <button
              type="button"
              onClick={() => setStudyMode("koreanOnly")}
              className={
                "rounded px-2.5 py-1 transition-all " +
                (studyMode === "koreanOnly"
                  ? "bg-ink text-surface font-medium shadow-xs"
                  : "text-ink-soft hover:bg-surface hover:text-ink")
              }
            >
              {t("mode.koreanOnly")}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {voiceGender !== "neutral" ? (
              <span className="font-mono text-[10.5px] text-ink-faint rounded bg-surface px-1.5 py-0.5 border border-line">
                {voiceGender === "male" ? "👨 남성 음성" : "👩 여성 음성"}
              </span>
            ) : null}
            <span className="font-mono text-[11px] text-ink-faint">
              총 {pairedSentences.length}개 문장 대조
            </span>
          </div>
        </div>
      ) : null}

      {/* 2. Top Instructions / Hints */}
      {blocks.map((block, i) => {
        if (block.type === "instruction") {
          return (
            <div
              key={i}
              className="rounded-r border-l-3 border-ink bg-raised/30 py-2.5 pl-4 pr-3 text-[14.5px] leading-relaxed text-ink font-normal"
            >
              {block.text}
            </div>
          );
        }
        if (block.type === "hints") {
          return (
            <div
              key={i}
              className="rounded border border-line bg-raised px-4 py-3 text-[13.5px] leading-relaxed text-ink"
            >
              <span className="mr-2.5 font-mono text-[10.5px] tracking-[0.18em] text-ink-faint uppercase font-medium">
                {t("vocabulary")}
              </span>
              <span className="font-mono text-[13px]">{block.text}</span>
            </div>
          );
        }
        return null;
      })}

      {/* 3. Main Aligned Sentences / Dialogue (문장별 대조 학습 구역) */}
      {pairedSentences.length > 0 ? (
        <section aria-label="Sentences" className="flex flex-col gap-3">
          {pairedSentences.map((item, idx) => {
            const isSpeaking = activeSentenceIndex === idx;
            const isRevealed = Boolean(revealedItems[idx]);

            return (
              <div
                key={idx}
                className={
                  "group relative rounded-lg border p-4 transition-all duration-150 " +
                  (isSpeaking
                    ? "border-ink bg-raised ring-1 ring-ink shadow-sm"
                    : "border-line bg-surface hover:border-line-strong hover:bg-raised/30")
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 flex-1 items-start">
                    {/* Number Badge */}
                    <span className="w-6 shrink-0 pt-0.5 text-right font-mono text-[12px] font-semibold tabular-nums text-ink-faint">
                      {item.numberLabel || idx + 1}
                    </span>

                    {/* Content Section */}
                    <div className="flex-1 flex flex-col gap-1.5">
                      {/* Target Language (English or Chinese) */}
                      {studyMode === "koreanOnly" && !isRevealed ? (
                        <button
                          type="button"
                          onClick={() => toggleReveal(idx)}
                          className="self-start inline-flex items-center gap-1.5 rounded border border-dashed border-line px-3 py-1 font-mono text-[12px] text-ink-soft hover:border-ink hover:text-ink"
                        >
                          👁️ 영어 확인하기
                        </button>
                      ) : (
                        <p
                          className={
                            "whitespace-pre-line text-[16px] font-medium leading-relaxed tracking-tight " +
                            (contentLang === "zh" ? "font-serif text-[17px] text-ink" : "text-ink")
                          }
                        >
                          {item.targetText}
                        </p>
                      )}

                      {/* Korean Translation */}
                      {item.translationText ? (
                        studyMode === "englishOnly" && !isRevealed ? (
                          <button
                            type="button"
                            onClick={() => toggleReveal(idx)}
                            className="self-start inline-flex items-center gap-1.5 rounded border border-dashed border-line px-2.5 py-0.5 font-mono text-[11px] text-ink-faint hover:border-ink hover:text-ink"
                          >
                            💬 {t("sentence.showTranslation")}
                          </button>
                        ) : (
                          <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-soft font-normal">
                            {item.translationText}
                          </p>
                        )
                      ) : null}
                    </div>
                  </div>

                  {/* Play Sentence Audio Button */}
                  <button
                    type="button"
                    onClick={() => playSentence(item.targetText, idx, item.audioSrc)}
                    aria-label={t("sentence.play")}
                    className={
                      "shrink-0 flex h-8 w-8 items-center justify-center rounded-full border transition-all " +
                      (isSpeaking
                        ? "border-ink bg-ink text-surface scale-105 shadow-xs"
                        : "border-line bg-surface text-ink-soft hover:border-ink hover:text-ink hover:scale-105 active:scale-95")
                    }
                  >
                    {isSpeaking ? (
                      <span className="h-2 w-2 rounded-xs bg-surface animate-pulse" />
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden className="ml-0.5">
                        <path d="M4 2.5v11a.5.5 0 0 0 .77.42l8.5-5.5a.5.5 0 0 0 0-.84l-8.5-5.5A.5.5 0 0 0 4 2.5Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

      {/* 4. Word Grid (Interactive Phonics Trainer) */}
      {blocks.map((block, i) => {
        if (block.type !== "wordgrid") return null;
        return (
          <div key={i} className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-ink-soft">
              <span className="font-mono text-[11px] text-ink-faint uppercase font-medium">
                🔤 발음 훈련 단어장
              </span>
              <span className="text-[11px] text-ink-faint">{t("wordgrid.clickToListen")}</span>
            </div>

            <div className="overflow-x-auto rounded border border-line bg-surface p-2 shadow-2xs">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {block.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => (
                        <td key={c} className="border border-line/60 p-1 text-center">
                          <button
                            type="button"
                            onClick={() => playWord(cell)}
                            className="w-full rounded px-2 py-2 font-mono text-[13px] font-medium text-ink transition-all hover:bg-ink hover:text-surface hover:scale-[1.02] active:scale-95 cursor-pointer"
                          >
                            {cell}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* 5. Fallback Paragraphs if no paired structure */}
      {pairedSentences.length === 0 &&
        blocks.map((block, i) => {
          if (block.type !== "paragraph") return null;
          return (
            <p
              key={i}
              lang={block.lang === "zh" ? "zh-Hans" : block.lang === "ko" ? "ko" : undefined}
              className={
                "text-[15px] leading-relaxed " +
                (block.lang === "ko"
                  ? "text-ink-soft"
                  : block.lang === "zh"
                    ? "text-ink font-serif text-[17px]"
                    : "text-ink")
              }
            >
              {block.text}
            </p>
          );
        })}

      {/* 6. Phrasal Chunk Drill (청크 직독직해 훈련) */}
      {chunkDrills && chunkDrills.length > 0 ? (
        <div className="rounded-xl border border-line bg-surface/80 p-5 shadow-xs">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                <span>🧩</span> 청크 직독직해 훈련 (Chunk Breakdown Drill)
              </h3>
              <p className="mt-0.5 text-[12px] text-ink-soft">
                문장을 의미 단위(청크)별로 끊어 듣고 따라 말해보세요. (카드를 누르면 발음 청취)
              </p>
            </div>
            <span className="rounded bg-raised px-2.5 py-0.5 font-mono text-[11px] text-ink-soft border border-line/60">
              {chunkDrills.length}개 청크
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {chunkDrills.map((chunk, idx) => (
              <div
                key={idx}
                onClick={() => playWord(chunk.en)}
                className="group flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-line/80 bg-raised/40 p-3 transition-all hover:border-ink/40 hover:bg-raised hover:shadow-2xs active:scale-[0.99]"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-medium text-ink group-hover:text-primary transition-colors">
                    {chunk.en}
                  </span>
                  <span className="text-[12px] text-ink-soft">
                    {chunk.ko}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playWord(chunk.en);
                  }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-ink-soft group-hover:bg-ink group-hover:text-surface transition-all shadow-2xs cursor-pointer"
                  title="청크 발음 듣기"
                  aria-label="청크 발음 듣기"
                >
                  <span className="text-[11px]">🔊</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 7. Dictation and Answer Verification Panel */}
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

function cleanSentenceText(text: string): string {
  if (!text) return "";
  return text
    .replace(/^\s*\d+[\.\)]\s*/, "") // remove leading "1." or "1)"
    .replace(/\s*\/\s*/g, " ")       // remove slashes
    .trim();
}

function isEnglishText(text: string): boolean {
  if (!text) return false;
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  const hangul = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;
  return latin >= hangul && latin > 0;
}

function hasKorean(text: string): boolean {
  if (!text) return false;
  return /[\uAC00-\uD7AF\u1100-\u11FF]/.test(text);
}

function isChineseText(text: string): boolean {
  if (!text) return false;
  return /[\u4E00-\u9FFF]/.test(text) && !hasKorean(text);
}

function splitSentences(text: string): string[] {
  if (!text) return [];
  return text
    .split(/(?<=[.?!])\s+/)
    .map((s) => cleanSentenceText(s))
    .filter((s) => s.length > 0);
}

function alignSentences(enSents: string[], koSents: string[]): { en: string; ko: string }[] {
  if (enSents.length === 0 && koSents.length === 0) return [];
  if (enSents.length === 0) return koSents.map((k) => ({ en: "", ko: k }));
  if (koSents.length === 0) return enSents.map((e) => ({ en: e, ko: "" }));

  if (enSents.length === koSents.length) {
    return enSents.map((en, i) => ({ en, ko: koSents[i] }));
  }

  const result: { en: string; ko: string }[] = [];
  if (enSents.length < koSents.length) {
    const numBuckets = enSents.length;
    const buckets: string[][] = Array.from({ length: numBuckets }, () => []);
    koSents.forEach((k, idx) => {
      const bucketIdx = Math.min(Math.floor((idx / koSents.length) * numBuckets), numBuckets - 1);
      buckets[bucketIdx].push(k);
    });
    for (let i = 0; i < numBuckets; i++) {
      result.push({ en: enSents[i], ko: buckets[i].join(" ") });
    }
  } else {
    const numBuckets = koSents.length;
    const buckets: string[][] = Array.from({ length: numBuckets }, () => []);
    enSents.forEach((e, idx) => {
      const bucketIdx = Math.min(Math.floor((idx / enSents.length) * numBuckets), numBuckets - 1);
      buckets[bucketIdx].push(e);
    });
    for (let i = 0; i < numBuckets; i++) {
      result.push({ en: buckets[i].join(" "), ko: koSents[i] });
    }
  }
  return result;
}

/**
 * Builds a structured, aligned array of sentences from main blocks and pairBlocks.
 * Automatically guarantees targetText is English (or Chinese) and translationText is Korean.
 */
function buildPairedSentences(
  blocks: Block[],
  pairBlocks: Block[] | null,
  course: string,
  isScript: boolean,
  audioTracks: { src: string; label?: string }[] = [],
  lessonKey: string = "",
): PairedSentence[] {
  const result: PairedSentence[] = [];

  // Skip chapter index pages (e.g. m1..m5, w1..w5, s1..s20, c1, c2) which are TOC menus, not sentence drills
  const lessonId = lessonKey.split("/")[1] || lessonKey;
  if (/^(m|w|s|c)\d+$/.test(lessonId)) {
    return result;
  }

  // -------------------------------------------------------------------------
  // 1. Basics QA track (qa011-1, etc.)
  // -------------------------------------------------------------------------
  if (course === "basics" && (lessonKey.includes("qa") || lessonId.startsWith("qa"))) {
    const sBlock = blocks.find((b) => b.type === "sentences") as { type: "sentences"; items: { n: string; text: string }[] } | undefined;
    const koParas = blocks.filter((b) => b.type === "paragraph" && b.lang === "ko") as { type: "paragraph"; text: string }[];
    if (sBlock && koParas.length > 0) {
      sBlock.items.forEach((item, idx) => {
        result.push({
          index: idx + 1,
          numberLabel: item.n || String(idx + 1),
          targetText: cleanSentenceText(item.text),
          translationText: koParas[idx]?.text?.trim() || "",
        });
      });
      return result;
    }
  }

  // -------------------------------------------------------------------------
  // 1.5. student course (clean sentences block with companion Korean paragraphs)
  // -------------------------------------------------------------------------
  if (course === "student") {
    const allSentItems = blocks
      .filter((b) => b.type === "sentences")
      .flatMap((b) => (b as { type: "sentences"; items: { n: string; text: string }[] }).items);
    const koParas = blocks.filter((b) => b.type === "paragraph" && b.lang === "ko") as { type: "paragraph"; text: string }[];

    if (allSentItems.length > 0) {
      allSentItems.forEach((item, idx) => {
        const ko = koParas[idx]?.text || "";
        const clipTrack = audioTracks[idx + 1];
        result.push({
          index: idx + 1,
          numberLabel: item.n || String(idx + 1),
          targetText: cleanSentenceText(item.text),
          translationText: ko.trim(),
          audioSrc: clipTrack?.src,
        });
      });
      return result;
    }
  }

  // -------------------------------------------------------------------------
  // 2. Dialogue courses (man, woman) - robust alternating & grouped pairs
  // -------------------------------------------------------------------------
  if (["man", "woman"].includes(course)) {
    const paragraphs = blocks.filter((b) => b.type === "paragraph") as { type: "paragraph"; text: string; lang?: string }[];
    const cleanParas: { text: string; isEn: boolean }[] = [];

    for (const p of paragraphs) {
      const t = (p.text || "").trim();
      if (!t) continue;
      if (t.includes("K-IG") || t.includes("<font") || t.includes("한/영") || /^Chapter\s+\d/i.test(t)) continue;
      if (/\s*:\s*$/.test(t)) continue;
      if (/^\d+\s+[A-Za-z]/.test(t)) continue;
      if (
        t.toLowerCase().includes("self-introduction") ||
        t.toLowerCase().includes("educational background") ||
        t.toLowerCase().includes("politics in korea")
      ) {
        if (t.length < 50) continue;
      }
      cleanParas.push({ text: t, isEn: isEnglishText(t) });
    }

    // Try alternating pairs first
    const altPairs: { en: string; ko: string }[] = [];
    let i = 0;
    while (i < cleanParas.length - 1) {
      const curr = cleanParas[i];
      const next = cleanParas[i + 1];
      if (curr.isEn !== next.isEn) {
        const en = curr.isEn ? curr.text : next.text;
        const ko = curr.isEn ? next.text : curr.text;
        altPairs.push({ en, ko });
        i += 2;
      } else {
        break;
      }
    }

    if (altPairs.length > 0 && i >= cleanParas.length - 2) {
      altPairs.forEach((pair, idx) => {
        const clipTrack = audioTracks[idx + 1];
        result.push({
          index: idx + 1,
          numberLabel: String(idx + 1),
          targetText: cleanSentenceText(pair.en),
          translationText: pair.ko.trim(),
          audioSrc: clipTrack?.src,
        });
      });
      return result;
    }

    // Otherwise group matching (all En then all Ko or vice versa)
    const enList = cleanParas.filter((p) => p.isEn);
    const koList = cleanParas.filter((p) => !p.isEn);
    const len = Math.min(enList.length, koList.length);

    for (let j = 0; j < len; j++) {
      const clipTrack = audioTracks[j + 1];
      result.push({
        index: j + 1,
        numberLabel: String(j + 1),
        targetText: cleanSentenceText(enList[j].text),
        translationText: koList[j].text.trim(),
        audioSrc: clipTrack?.src,
      });
    }

    if (result.length > 0) return result;
  }

  // -------------------------------------------------------------------------
  // 3. Chinese track (chinese c1-1 ~ c1-6)
  // -------------------------------------------------------------------------
  if (course === "chinese") {
    const paras = blocks.filter((b) => b.type === "paragraph") as { type: "paragraph"; text: string; lang?: string }[];
    const clean: string[] = [];

    for (const p of paras) {
      const t = (p.text || "").trim();
      if (!t) continue;
      if (t.includes("自我介绍") || t.includes("한/중") || /^Principle/i.test(t) || /^Chapter/i.test(t)) continue;
      if (t.includes("(인사)") || t.includes("(이름") || t.includes("(성격)") || t.includes("(취미)") || t.includes("(과목)") || t.includes("(봉사")) continue;
      clean.push(t);
    }

    const zhList = clean.filter((t) => isChineseText(t) || (!hasKorean(t) && /[\u4E00-\u9FFF]/.test(t)));
    const koList = clean.filter((t) => hasKorean(t));
    const len = Math.min(zhList.length, koList.length);

    for (let j = 0; j < len; j++) {
      result.push({
        index: j + 1,
        numberLabel: String(j + 1),
        targetText: cleanSentenceText(zhList[j]),
        translationText: koList[j].trim(),
      });
    }

    if (result.length > 0) return result;
  }

  // -------------------------------------------------------------------------
  // 4. Reading Passages - handled by dedicated ReadingLearningView
  // -------------------------------------------------------------------------
  if (course === "reading") {
    return result;
  }

  // -------------------------------------------------------------------------
  // 5. Listening & Dictation (ld) - handled by dedicated LdLearningView
  // -------------------------------------------------------------------------
  if (course === "ld") {
    return result;
  }

  // -------------------------------------------------------------------------
  // 5.5 Grammar 1 & 2 - handled by dedicated GrammarLearningView
  // -------------------------------------------------------------------------
  if (course === "grammar1" || course === "grammar2") {
    return result;
  }

  // -------------------------------------------------------------------------
  // 6. Sentence blocks (basics, middle, adults)
  // Flatten ALL sentences blocks to prevent dropping items 14-25+
  // -------------------------------------------------------------------------
  const mainItems = blocks
    .filter((b) => b.type === "sentences")
    .flatMap((b) => (b as { type: "sentences"; items: { n: string; text: string }[] }).items);
  const pairItems = pairBlocks
    ? pairBlocks
        .filter((b) => b.type === "sentences")
        .flatMap((b) => (b as { type: "sentences"; items: { n: string; text: string }[] }).items)
    : [];

  if (mainItems.length > 0 && pairItems.length > 0) {
    const len = Math.max(mainItems.length, pairItems.length);

    for (let i = 0; i < len; i++) {
      const m = mainItems[i];
      const p = pairItems[i];
      const textM = m?.text ?? "";
      const textP = p?.text ?? "";

      let target = "";
      let translation = "";

      if (course === "chinese") {
        target = isScript ? textP : textM;
        translation = isScript ? textM : textP;
      } else if (isEnglishText(textM) && !isEnglishText(textP)) {
        target = textM;
        translation = textP;
      } else if (!isEnglishText(textM) && isEnglishText(textP)) {
        target = textP;
        translation = textM;
      } else if (hasKorean(textM) && !hasKorean(textP)) {
        target = textP;
        translation = textM;
      } else if (!hasKorean(textM) && hasKorean(textP)) {
        target = textM;
        translation = textP;
      } else {
        // Fallback: If text contains Korean, NEVER put into targetText
        if (hasKorean(textM)) {
          target = textP;
          translation = textM;
        } else {
          target = isScript ? textP : textM;
          translation = isScript ? textM : textP;
        }
      }

      result.push({
        index: i + 1,
        numberLabel: m?.n ?? p?.n ?? String(i + 1),
        targetText: cleanSentenceText(target),
        translationText: translation.trim(),
      });
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // 7. Single-side Sentences blocks with paragraph pair
  // -------------------------------------------------------------------------
  if (mainItems.length > 0) {
    const localKoParas = blocks.filter((b) => b.type === "paragraph" && b.lang === "ko") as { type: "paragraph"; text: string }[];
    const pairParas = localKoParas.length > 0
      ? localKoParas
      : (pairBlocks
          ? (pairBlocks.filter((b) => b.type === "paragraph") as { type: "paragraph"; text: string }[])
          : []);

    mainItems.forEach((item, i) => {
      const textM = item.text ?? "";
      const textP = pairParas[i]?.text ?? "";

      let target = "";
      let translation = "";

      if (isEnglishText(textM) && !isEnglishText(textP)) {
        target = textM;
        translation = textP;
      } else if (!isEnglishText(textM) && isEnglishText(textP)) {
        target = textP;
        translation = textM;
      } else if (hasKorean(textM)) {
        target = isEnglishText(textP) ? textP : "";
        translation = textM;
      } else {
        target = textM;
        translation = textP;
      }

      result.push({
        index: i + 1,
        numberLabel: item.n || String(i + 1),
        targetText: cleanSentenceText(target),
        translationText: translation.trim(),
      });
    });
    return result;
  }

  return result;
}

