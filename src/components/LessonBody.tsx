"use client";

import { useState } from "react";
import type { Block } from "@/lib/types";
import { useLanguage } from "./LanguageProvider";
import { DictationPanel } from "./DictationPanel";
import { speakText, stopSpeech } from "@/lib/speech";

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
 */
export function LessonBody({
  blocks,
  pairBlocks = null,
  course,
  lessonKey,
  isScript = false,
  contentLang = "en",
  audioTracks = [],
}: {
  blocks: Block[];
  pairBlocks?: Block[] | null;
  course: string;
  lessonKey: string;
  isScript?: boolean;
  contentLang?: string;
  audioTracks?: { src: string; label?: string }[];
}) {
  const { t } = useLanguage();

  // Learning modes: 'bilingual' (대조), 'englishOnly' (영어집중), 'koreanOnly' (영작훈련)
  const [studyMode, setStudyMode] = useState<"bilingual" | "englishOnly" | "koreanOnly">("bilingual");
  const [revealedItems, setRevealedItems] = useState<Record<number, boolean>>({});
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);

  // Extract choices & dictation
  const choice = blocks.find((b) => b.type === "choice") || pairBlocks?.find((b) => b.type === "choice");
  const dictation = blocks.find((b) => b.type === "dictation") || pairBlocks?.find((b) => b.type === "dictation");

  // Pair sentences between main lesson and paired script
  const pairedSentences = buildPairedSentences(blocks, pairBlocks, course, isScript, audioTracks);

  // Collect all target language sentences for dictation answer checking
  const referenceSentences = pairedSentences.map((s) => s.targetText).filter(Boolean);

  function toggleReveal(idx: number) {
    setRevealedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  function playSentence(text: string, idx: number, audioSrc?: string) {
    if (!text) return;
    setActiveSentenceIndex(idx);

    // If an individual clip audio file exists, try playing it, otherwise TTS
    if (audioSrc) {
      const audio = new Audio(audioSrc);
      audio.onended = () => setActiveSentenceIndex(null);
      audio.onerror = () => {
        // Fallback to speech synthesis
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
      rate: 0.95,
      onStart: () => setActiveSentenceIndex(idx),
      onEnd: () => setActiveSentenceIndex(null),
      onError: () => setActiveSentenceIndex(null),
    });
  }

  function playWord(word: string) {
    speakText(word, {
      lang: contentLang,
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

          <span className="font-mono text-[11px] text-ink-faint">
            총 {pairedSentences.length}개 문장 대조
          </span>
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

      {/* 6. Dictation and Answer Verification Panel */}
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

/**
 * Builds a structured, aligned array of sentences from main blocks and pairBlocks.
 */
function buildPairedSentences(
  blocks: Block[],
  pairBlocks: Block[] | null,
  course: string,
  isScript: boolean,
  audioTracks: { src: string; label?: string }[] = [],
): PairedSentence[] {
  const result: PairedSentence[] = [];

  // Case A: Dialogue courses (man, woman, student) - alternating paragraphs
  if (["man", "woman", "student"].includes(course)) {
    const paragraphs = blocks.filter((b) => b.type === "paragraph") as { type: "paragraph"; text: string; lang?: string }[];
    
    // Group adjacent ko + en or en + ko
    let currentEn = "";
    let currentKo = "";
    let count = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      if (p.lang === "ko") {
        currentKo = p.text;
      } else {
        currentEn = p.text;
      }

      // If both filled or at the end
      if (currentEn && currentKo) {
        count++;
        // Flash courses: track 0 is full lesson, track count is clip count
        const clipTrack = audioTracks[count];
        result.push({
          index: count,
          numberLabel: String(count),
          targetText: currentEn,
          translationText: currentKo,
          audioSrc: clipTrack?.src,
        });
        currentEn = "";
        currentKo = "";
      }
    }

    // Remaining single entry
    if (currentEn || currentKo) {
      count++;
      result.push({
        index: count,
        numberLabel: String(count),
        targetText: currentEn || currentKo,
        translationText: currentEn ? "" : currentKo,
      });
    }

    if (result.length > 0) return result;
  }

  // Case B: Sentences blocks in main and paired script (e.g. basics po01 <-> po01-1)
  const mainSentencesBlock = blocks.find((b) => b.type === "sentences") as { type: "sentences"; items: { n: string; text: string }[] } | undefined;
  const pairSentencesBlock = pairBlocks?.find((b) => b.type === "sentences") as { type: "sentences"; items: { n: string; text: string }[] } | undefined;

  if (mainSentencesBlock && pairSentencesBlock) {
    const mainItems = mainSentencesBlock.items;
    const pairItems = pairSentencesBlock.items;
    const len = Math.max(mainItems.length, pairItems.length);

    for (let i = 0; i < len; i++) {
      const m = mainItems[i];
      const p = pairItems[i];
      result.push({
        index: i + 1,
        numberLabel: m?.n ?? p?.n ?? String(i + 1),
        targetText: isScript ? p?.text ?? "" : m?.text ?? "",
        translationText: isScript ? m?.text ?? "" : p?.text ?? "",
      });
    }
    return result;
  }

  // Case C: Main has sentences block, pair has paragraphs (e.g. ld d001-1 or middle)
  if (mainSentencesBlock) {
    const pairParas = pairBlocks
      ? (pairBlocks.filter((b) => b.type === "paragraph") as { type: "paragraph"; text: string }[])
      : [];

    mainSentencesBlock.items.forEach((item, i) => {
      result.push({
        index: i + 1,
        numberLabel: item.n || String(i + 1),
        targetText: isScript ? pairParas[i]?.text ?? "" : item.text,
        translationText: isScript ? item.text : pairParas[i]?.text ?? "",
      });
    });
    return result;
  }

  // Case D: Reading passages (reading pr001 <-> pr001-1)
  if (course === "reading") {
    const mainInst = blocks.find((b) => b.type === "instruction");
    const pairInst = pairBlocks?.find((b) => b.type === "instruction");

    if (mainInst?.type === "instruction") {
      const enSentences = splitSentences(mainInst.text);
      const koSentences = pairInst?.type === "instruction" ? splitSentences(pairInst.text) : [];
      const len = Math.max(enSentences.length, koSentences.length);

      for (let i = 0; i < len; i++) {
        result.push({
          index: i + 1,
          numberLabel: String(i + 1),
          targetText: isScript ? koSentences[i] ?? "" : enSentences[i] ?? "",
          translationText: isScript ? enSentences[i] ?? "" : koSentences[i] ?? "",
        });
      }
      return result;
    }
  }

  return result;
}

function splitSentences(paragraph: string): string[] {
  if (!paragraph) return [];
  // Split by sentence terminators while retaining punctuation
  return paragraph
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
