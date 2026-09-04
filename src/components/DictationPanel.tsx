"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";

/**
 * Replaces the legacy answer form.
 *
 * The original pages collected a multiple-choice answer and a dictation, then
 * "submitted" them by opening the student's mail client with a `mailto:` action
 * — which no longer works in any modern browser and never reached a server
 * anyway. Since the app has no backend and no database by design, the student's
 * work is kept in their own browser instead, which is both more useful than the
 * mail draft and requires nothing to host.
 */
export function DictationPanel({
  options,
  rows,
  storageKey,
}: {
  options: string[] | null;
  rows: number | null;
  storageKey: string;
}) {
  const { t } = useLanguage();
  const [choice, setChoice] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [restored, setRestored] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const key = `kig:work:${storageKey}`;

  // Restore any previous attempt. Storage can throw in private modes, so every
  // access is guarded and the panel stays fully usable without it.
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
      // no stored work available — nothing to restore
    }
    setRestored(true);
  }, [key]);

  // Persist after the initial restore, debounced so typing stays smooth.
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
        // storage unavailable — the work simply isn't kept between visits
      }
    }, 400);
    return () => clearTimeout(id);
  }, [choice, text, key, restored]);

  function clearWork() {
    setChoice(null);
    setText("");
  }

  return (
    <section className="mt-4 border border-line p-5">
      <h2 className="mb-5 font-mono text-[10.5px] tracking-[0.18em] text-ink-faint uppercase">
        {t("answer.title")}
      </h2>

      {options && options.length > 0 ? (
        <fieldset className="mb-5">
          <legend className="mb-2.5 text-[13px] text-ink-soft">{t("answer.chooseOne")}</legend>
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
                    "flex h-10 w-10 items-center justify-center rounded-full border text-[13px] hover:scale-105 active:scale-95 " +
                    (selected
                      ? "border-ink bg-ink text-surface"
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
        <div>
          <label
            htmlFor="dictation"
            className="mb-2.5 block text-[13px] text-ink-soft"
          >
            {t("answer.dictation")}
          </label>
          <textarea
            id="dictation"
            rows={Math.min(rows, 14)}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("answer.placeholder")}
            spellCheck={false}
            className="w-full resize-y border border-line bg-surface p-3 font-mono text-[13px] leading-relaxed text-ink hover:border-line-strong focus:border-line-strong focus:outline-none"
          />
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="font-mono text-[10.5px] text-ink-faint">
          {savedAt ? t("answer.saved") : t("answer.localOnly")}
        </p>
        {choice || text ? (
          <button
            type="button"
            onClick={clearWork}
            className="px-2 py-1 font-mono text-[10.5px] text-ink-soft hover:bg-raised hover:text-ink"
          >
            {t("answer.clear")}
          </button>
        ) : null}
      </div>
    </section>
  );
}
