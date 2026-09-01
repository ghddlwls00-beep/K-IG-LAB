"use client";

import { useEffect, useRef, useState } from "react";
import { LANGUAGES } from "@/lib/i18n";
import { useLanguage } from "./LanguageProvider";

/**
 * Globe menu for the interface language.
 *
 * Each language is written in its own script (日本語, 中文) rather than
 * translated into the current one — that is what someone scanning for their
 * own language actually looks for.
 */
export function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape, the two things a menu must do.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <div ref={root} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t("nav.language")}: ${current.label}`}
        className="flex items-center gap-1.5 px-2 py-1.5 text-ink-soft hover:text-ink"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
          className={"transition-transform duration-300 ease-out " + (open ? "rotate-180" : "")}
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c2.5 2.7 3.8 5.8 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.8-3.8-9S9.5 5.7 12 3Z" />
        </svg>
        <span className="font-mono text-[11px] tracking-wide uppercase">{current.code}</span>
      </button>

      {/*
        Kept mounted so it can animate both ways rather than popping in — but a
        closed menu must be genuinely gone, not just transparent. `opacity-0`
        alone leaves the items hit-testable and still exposed to screen readers,
        so visibility (which is part of the transition, and so waits for the
        fade) plus `inert` take it out of the page entirely when closed.
      */}
      <div
        role="menu"
        aria-label={t("nav.language")}
        aria-hidden={!open}
        inert={!open}
        className={
          "absolute right-0 z-50 mt-1 min-w-[9.5rem] origin-top-right border border-line bg-surface py-1 transition-[opacity,transform,visibility] duration-200 ease-out " +
          (open ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0")
        }
      >
        {LANGUAGES.map((l) => {
          const active = l.code === lang;
          return (
            <button
              key={l.code}
              role="menuitemradio"
              aria-checked={active}
              tabIndex={open ? 0 : -1}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={
                "flex w-full items-baseline justify-between gap-4 px-3 py-2 text-left text-[13px] hover:bg-raised " +
                (active ? "text-ink" : "text-ink-soft")
              }
            >
              <span>{l.endonym}</span>
              <span className="font-mono text-[10px] tracking-wide text-ink-faint uppercase">
                {active ? "●" : l.code}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
