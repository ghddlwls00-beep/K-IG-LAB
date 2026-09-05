"use client";

import { useState } from "react";
import type { Block } from "@/lib/types";
import { speakText, stopSpeech } from "@/lib/speech";

interface CnnLearningViewProps {
  blocks: Block[];
  lessonKey: string;
}

export function CnnLearningView({ blocks, lessonKey }: CnnLearningViewProps) {
  // Extract heading, English paragraphs, Korean paragraphs, vocabulary sentences, phonetic tips
  const heading = blocks.find((b) => b.type === "heading")?.text || "CNN News Listening";

  const paras = blocks.filter((b) => b.type === "paragraph") as {
    type: "paragraph";
    text: string;
    lang?: "en" | "ko" | "zh";
  }[];

  const enParas = paras.filter((p) => p.lang === "en").map((p) => p.text.trim());
  const koParas = paras.filter((p) => p.lang === "ko" && !p.text.startsWith("cf.") && !p.text.includes("발음")).map((p) => p.text.trim());

  // Phonetic notes from paragraph blocks
  const phoneticTips = paras
    .filter((p) => p.text.includes("발음") || p.text.includes("탈락") || p.text.includes("들리고") || p.text.includes("축약"))
    .map((p) => p.text.trim());

  // Vocabulary block from sentences
  const vocabBlock = blocks.find((b) => b.type === "sentences") as
    | { type: "sentences"; items: { n: string; text: string }[] }
    | undefined;
  const vocabItems = vocabBlock?.items ?? [];

  const [activeTab, setActiveTab] = useState<"script" | "vocab" | "phonetics">("script");
  const [layoutMode, setLayoutMode] = useState<"dual" | "paired">("paired");

  const pairCount = Math.max(enParas.length, koParas.length);
  const pairedTranscript: { en: string; ko: string }[] = [];
  for (let i = 0; i < pairCount; i++) {
    pairedTranscript.push({
      en: enParas[i] || "",
      ko: koParas[i] || "",
    });
  }

  function playEnglishSnippet(text: string) {
    stopSpeech();
    speakText(text, { lang: "en", rate: 0.95 });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/90 p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600/10 text-[14px] text-red-600 font-bold font-mono">
              CNN
            </span>
            <h2 className="text-[16px] font-bold text-ink">{heading}</h2>
          </div>
          <p className="text-[12px] text-ink-soft mt-1">
            원어 방송 영상을 시청하며 실전 보도 스크립트 대조, 시사 어휘, 연음 청취 비법을 마스터하세요.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center rounded-xl bg-raised/80 p-1 border border-line/70 text-[12px] font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("script")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "script"
                ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Step 1 · 📰 실전 대본 대조
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("vocab")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "vocab"
                ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Step 3 · 📚 시사 어휘 ({vocabItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("phonetics")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "phonetics"
                ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Step 2 · 🎙️ 연음 디코딩 ({phoneticTips.length})
          </button>
        </div>
      </div>

      {/* TAB 1: NEWS TRANSCRIPT */}
      {activeTab === "script" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-ink-faint uppercase font-medium">
              방송 대본 뷰어
            </span>
            <div className="flex items-center gap-1 rounded-lg border border-line bg-surface p-0.5 text-[11.5px]">
              <button
                type="button"
                onClick={() => setLayoutMode("paired")}
                className={`px-2.5 py-1 rounded cursor-pointer ${layoutMode === "paired" ? "bg-raised font-semibold text-ink" : "text-ink-soft"}`}
              >
                단락별 1:1 대조
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("dual")}
                className={`px-2.5 py-1 rounded cursor-pointer ${layoutMode === "dual" ? "bg-raised font-semibold text-ink" : "text-ink-soft"}`}
              >
                좌우 나란히 보기
              </button>
            </div>
          </div>

          {layoutMode === "paired" ? (
            <div className="flex flex-col gap-4">
              {pairedTranscript.map((item, idx) => (
                <div key={idx} className="rounded-2xl border border-line bg-surface p-5 shadow-2xs flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11.5px] font-bold text-ink-faint">
                      Section #{idx + 1}
                    </span>
                    {item.en && (
                      <button
                        type="button"
                        onClick={() => playEnglishSnippet(item.en)}
                        className="text-[11.5px] text-ink-soft hover:text-ink cursor-pointer"
                      >
                        🔊 낭독 듣기
                      </button>
                    )}
                  </div>
                  {item.en && (
                    <p className="text-[15.5px] font-serif leading-relaxed text-ink text-justify">
                      {item.en}
                    </p>
                  )}
                  {item.ko && (
                    <p className="text-[14px] leading-relaxed text-ink-soft border-t border-line/40 pt-2.5 text-justify">
                      {item.ko}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-col gap-4">
                <span className="font-mono text-[11.5px] font-bold text-ink uppercase tracking-wider border-b border-line/60 pb-2">
                  English Report
                </span>
                {enParas.map((text, i) => (
                  <p key={i} className="text-[14.5px] font-serif leading-relaxed text-ink text-justify">
                    {text}
                  </p>
                ))}
              </div>

              <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-col gap-4">
                <span className="font-mono text-[11.5px] font-bold text-ink-soft uppercase tracking-wider border-b border-line/60 pb-2">
                  Korean Translation
                </span>
                {koParas.map((text, i) => (
                  <p key={i} className="text-[13.5px] leading-relaxed text-ink-soft text-justify">
                    {text}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: VOCABULARY GLOSSARY */}
      {activeTab === "vocab" && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-line bg-surface p-4 text-[13px] text-ink-soft leading-relaxed shadow-2xs">
            <span className="font-semibold text-ink">📚 뉴스 어휘 사전:</span> 본 뉴스 클립에 등장하는 핵심 시사 어휘, 관용구, 영국 정치 전문 용어 해설입니다.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {vocabItems.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-4 shadow-2xs hover:border-line-strong transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[13.5px] font-bold text-ink text-primary">
                    {item.n}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakText(item.n.replace(/^\d+\)\s*/, ""), { lang: "en" })}
                    className="text-[11px] text-ink-faint hover:text-ink cursor-pointer"
                  >
                    🔊
                  </button>
                </div>
                <p className="text-[13px] text-ink-soft leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PHONETIC TIPS */}
      {activeTab === "phonetics" && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-line bg-surface p-4 text-[13px] text-ink-soft leading-relaxed shadow-2xs">
            <span className="font-semibold text-ink">🎙️ 원어민 청취 & 연음 해설:</span> 뉴스 앵커와 리포터의 빠른 발화에서 일어나는 자음 탈락, 영국식 모음 변화, 축약 발음 포인트입니다.
          </div>

          <div className="flex flex-col gap-3">
            {phoneticTips.map((tip, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4 shadow-2xs"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised font-mono text-[11px] font-bold text-ink">
                  {idx + 1}
                </span>
                <p className="text-[14px] text-ink leading-relaxed font-medium">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
