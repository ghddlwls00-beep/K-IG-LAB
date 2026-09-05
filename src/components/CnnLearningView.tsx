"use client";

import { useState } from "react";
import type { Block } from "@/lib/types";

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

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/90 p-4.5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600/10 text-[14px] text-red-600 font-bold font-mono">
              CNN
            </span>
            <h2 className="text-[16px] font-bold text-ink">{heading}</h2>
          </div>
          <p className="text-[12px] text-ink-soft mt-1">
            Stephen Krashen의 실제 언어 자료(Authentic Materials)와 Paul Nation의 시사 담화 어휘 분석으로 고급 청취력을 완성하세요.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center rounded-xl bg-raised/80 p-1 border border-line/70 text-[12px] font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("script")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "script"
                ? "bg-surface text-ink font-bold shadow-2xs border border-line/80"
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
                ? "bg-surface text-ink font-bold shadow-2xs border border-line/80"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Step 2 · 📚 시사 어휘 ({vocabItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("phonetics")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "phonetics"
                ? "bg-surface text-ink font-bold shadow-2xs border border-line/80"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Step 3 · 🎙️ 연음 청취 해설
          </button>
        </div>
      </div>

      {/* TAB 1: SCRIPT VIEW */}
      {activeTab === "script" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-ink-soft">
              상단 방송 원본 비디오를 재생하며 문단별로 번갈아 대조해 보세요.
            </span>
            <div className="flex items-center rounded-lg border border-line bg-raised/50 p-0.5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setLayoutMode("paired")}
                className={`px-2.5 py-1 rounded cursor-pointer ${layoutMode === "paired" ? "bg-surface text-ink font-bold shadow-2xs" : "text-ink-soft"}`}
              >
                문단별 대조
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("dual")}
                className={`px-2.5 py-1 rounded cursor-pointer ${layoutMode === "dual" ? "bg-surface text-ink font-bold shadow-2xs" : "text-ink-soft"}`}
              >
                좌우 분할
              </button>
            </div>
          </div>

          {layoutMode === "paired" ? (
            <div className="flex flex-col gap-3">
              {pairedTranscript.map((para, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5 shadow-2xs hover:border-line-strong transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-raised font-mono text-[11px] font-bold text-ink">
                      {idx + 1}
                    </span>
                    <span className="font-mono text-[11px] text-ink-faint">
                      Paragraph #{idx + 1}
                    </span>
                  </div>

                  <p className="text-[16px] font-bold text-ink leading-relaxed tracking-tight">
                    {para.en}
                  </p>

                  {para.ko && (
                    <p className="text-[14px] text-ink-soft border-t border-line/40 pt-2 font-normal leading-relaxed">
                      {para.ko}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xs flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-line/60 pb-2">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
                    English Broadcast Script
                  </span>
                  <span className="text-[11px] text-ink-faint">{enParas.length} Paras</span>
                </div>
                {enParas.map((text, idx) => (
                  <p key={idx} className="text-[14.5px] text-ink leading-relaxed font-medium">
                    {text}
                  </p>
                ))}
              </div>

              <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xs flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-line/60 pb-2">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                    Korean Translation
                  </span>
                  <span className="text-[11px] text-ink-faint">{koParas.length} Paras</span>
                </div>
                {koParas.map((text, idx) => (
                  <p key={idx} className="text-[14px] text-ink-soft leading-relaxed font-normal">
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
            <span className="font-semibold text-ink">📚 Paul Nation's Academic Word List:</span> 뉴스 클립에 등장하는 핵심 시사 어휘, 관용적 연어(Collocations), 외교/정치 전문 용어 해설입니다.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vocabItems.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface p-4 shadow-2xs hover:border-line-strong transition-colors"
              >
                <span className="font-mono text-[14px] font-bold text-primary">
                  {item.n}
                </span>
                <p className="text-[13.5px] text-ink leading-relaxed font-normal">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PHONETIC TIPS */}
      {activeTab === "phonetics" && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-line bg-surface p-4 text-[13px] text-ink-soft leading-relaxed shadow-2xs">
            <span className="font-semibold text-ink">🎙️ Connected Speech & Acoustic Decoding:</span> 빠른 방송 발화에서 일어나는 연음, 자음 탈락(Elision), 강세 약화(Weak Forms) 청취 포인트입니다.
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
