"use client";

import type { Block } from "@/lib/types";
import { useLanguage } from "./LanguageProvider";
import { DictationPanel } from "./DictationPanel";

/**
 * Renders a lesson's typed blocks. One component covers every drill page in the
 * archive — the legacy site expressed these same shapes as nested tables and
 * inline font tags in ~2,700 separate files.
 */
export function LessonBody({ blocks, lessonKey }: { blocks: Block[]; lessonKey: string }) {
  const { t } = useLanguage();
  const choice = blocks.find((b) => b.type === "choice");
  const dictation = blocks.find((b) => b.type === "dictation");

  return (
    <div className="flex flex-col gap-6">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            return null; // rendered in the page header instead

          case "instruction":
            return (
              <p
                key={i}
                className="border-l border-line-strong pl-4 text-[15px] leading-relaxed text-ink-soft"
              >
                {block.text}
              </p>
            );

          case "hints":
            return (
              <div
                key={i}
                className="border border-line bg-raised px-4 py-3 text-[13.5px] leading-relaxed text-ink"
              >
                <span className="mr-2.5 font-mono text-[10.5px] tracking-[0.18em] text-ink-faint uppercase">
                  {t("vocabulary")}
                </span>
                {block.text}
              </div>
            );

          case "sentences":
            return (
              <ol key={i} className="flex flex-col gap-2">
                {/*
                  Keyed by position, not by the printed number. The numbers come
                  from the source material and are not unique — a unit contents
                  list can hold both "06. 服务活动" and "06. Helping Hand", and a
                  glossary repeats a term. Position is the only stable identity.
                */}
                {block.items.map((item, index) => (
                  <li
                    key={`${index}-${item.n}`}
                    className="flex gap-3 text-[15px] leading-relaxed"
                  >
                    <span className="w-6 shrink-0 pt-0.5 text-right font-mono text-[11px] tabular-nums text-ink-faint">
                      {item.n}
                    </span>
                    {/* Pinyin guides put the romanisation on a second line
                        inside one entry, so newlines have to survive. */}
                    <span className="whitespace-pre-line text-ink">{item.text}</span>
                  </li>
                ))}
              </ol>
            );

          case "wordgrid":
            return (
              <div key={i} className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) => (
                          <td
                            key={c}
                            className="border border-line px-3 py-2 text-center text-[13px] text-ink transition-colors duration-200 ease-out hover:bg-raised"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case "paragraph":
            // Tagging the script lets the browser pick a proper CJK face and
            // lets screen readers switch voice mid-lesson.
            return (
              <p
                key={i}
                lang={block.lang === "zh" ? "zh-Hans" : block.lang === "ko" ? "ko" : undefined}
                className="text-[15px] leading-relaxed text-ink-soft"
              >
                {block.text}
              </p>
            );

          default:
            return null; // choice + dictation are composed together below
        }
      })}

      {choice || dictation ? (
        <DictationPanel
          options={choice?.type === "choice" ? choice.options : null}
          rows={dictation?.type === "dictation" ? dictation.rows : null}
          storageKey={lessonKey}
        />
      ) : null}
    </div>
  );
}
