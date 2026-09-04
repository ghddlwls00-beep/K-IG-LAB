"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";

/**
 * Enhanced Dictation and Answer Verification Panel.
 *
 * Persists student work to localStorage and provides instant sentence-by-sentence
 * comparison against the actual transcript so learners can verify their spelling,
 * grammar, and listening accuracy.
 */
export function DictationPanel({
  options,
  rows,
  storageKey,
  referenceSentences = [],
}: {
  options: string[] | null;
  rows: number | null;
  storageKey: string;
  referenceSentences?: string[];
}) {
  const { t } = useLanguage();
  const [choice, setChoice] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [restored, setRestored] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [showAnswerCheck, setShowAnswerCheck] = useState(false);

  const key = `kig:work:${storageKey}`;

  // Restore previous attempt
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw) as { choice?: string; text?: string; at?: string };
        setChoice(saved.choice ?? null);
        setText(saved.text ?? "");
        setSavedAt(saved.at ?? null);
      }
    } catch {
      // ignore storage errors
    }
    setRestored(true);
  }, [key]);

  // Persist after restore
  useEffect(() => {
    if (!restored) return;
    const id = setTimeout(() => {
      try {
        if (!choice && !text) {
          window.localStorage.removeItem(key);
          setSavedAt(null);
          return;
        }
        const at = new Date().toISOString();
        window.localStorage.setItem(key, JSON.stringify({ choice, text, at }));
        setSavedAt(at);
      } catch {
        // storage unavailable
      }
    }, 400);
    return () => clearTimeout(id);
  }, [choice, text, key, restored]);

  function clearWork() {
    setChoice(null);
    setText("");
    setShowAnswerCheck(false);
  }

  return (
    <section className="mt-8 border border-line bg-surface p-5 rounded-sm shadow-xs">
      <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
        <h2 className="font-mono text-[11px] tracking-[0.18em] text-ink-faint uppercase font-medium">
          {t("answer.title")}
        </h2>
        {savedAt ? (
          <span className="font-mono text-[10px] text-ink-faint">
            {t("answer.saved")}
          </span>
        ) : null}
      </div>

      {options && options.length > 0 ? (
        <fieldset className="mb-6">
          <legend className="mb-3 text-[13.5px] font-medium text-ink-soft">
            {t("answer.chooseOne")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {options.map((opt, i) => {
              const selected = choice === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setChoice(selected ? null : opt)}
                  aria-pressed={selected}
                  className={
                    "flex h-10 w-10 items-center justify-center rounded-full border text-[13px] font-medium transition-all hover:scale-105 active:scale-95 " +
                    (selected
                      ? "border-ink bg-ink text-surface shadow-xs"
                      : "border-line text-ink-soft hover:border-line-strong hover:text-ink")
                  }
                >
                  {"①②③④⑤⑥⑦⑧⑨⑩"[i] ?? i + 1}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {rows ? (
        <div className="mb-4">
          <label htmlFor="dictation" className="mb-2.5 flex items-center justify-between text-[13.5px] font-medium text-ink-soft">
            <span>{t("answer.dictation")}</span>
            <span className="font-mono text-[11px] text-ink-faint font-normal">
              듣고 단어/문장을 직접 타이핑해 보세요
            </span>
          </label>
          <textarea
            id="dictation"
            rows={Math.min(rows, 10)}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("answer.placeholder")}
            spellCheck={false}
            className="w-full resize-y border border-line bg-surface p-3.5 font-mono text-[13.5px] leading-relaxed text-ink hover:border-line-strong focus:border-line-strong focus:outline-none rounded-sm transition-colors"
          />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {referenceSentences.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowAnswerCheck(!showAnswerCheck)}
              className="inline-flex items-center gap-1.5 rounded border border-line-strong bg-raised px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-line transition-colors"
            >
              <span>{showAnswerCheck ? "✓" : "🔍"}</span>
              <span>{showAnswerCheck ? t("answer.hideCheck") : t("answer.check")}</span>
            </button>
          ) : null}

          {choice || text ? (
            <button
              type="button"
              onClick={clearWork}
              className="rounded px-2.5 py-1.5 font-mono text-[11px] text-ink-soft hover:bg-raised hover:text-ink transition-colors"
            >
              {t("answer.clear")}
            </button>
          ) : null}
        </div>

        <p className="font-mono text-[10.5px] text-ink-faint">
          {t("answer.localOnly")}
        </p>
      </div>

      {/* Answer verification modal / card */}
      {showAnswerCheck && referenceSentences.length > 0 ? (
        <div className="mt-5 border-t border-dashed border-line pt-4" style={{ animation: "fadeUp 200ms ease both" }}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-mono text-[11px] font-medium tracking-wider text-ink-soft uppercase">
              📖 원문 정답 대조 (Reference Answers)
            </h3>
            <span className="text-[11px] text-ink-faint">
              총 {referenceSentences.length}개 문장
            </span>
          </div>

          <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto pr-1">
            {referenceSentences.map((ref, idx) => (
              <div key={idx} className="border border-line bg-raised/40 p-2.5 rounded text-[13px] leading-relaxed">
                <div className="flex gap-2 items-start">
                  <span className="shrink-0 font-mono text-[10.5px] text-ink-faint pt-0.5">
                    #{idx + 1}
                  </span>
                  <p className="text-ink select-text font-mono text-[13px]">
                    {ref}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
