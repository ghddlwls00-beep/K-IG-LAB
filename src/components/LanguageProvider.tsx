"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  DEFAULT_LANG,
  HTML_LANG,
  translate,
  translateFormat,
  type LangCode,
  type StringKey,
} from "@/lib/i18n";

/**
 * Interface language, held client-side.
 *
 * The pages are statically generated, so the server has no idea who is asking.
 * The chosen language therefore lives in the browser: the HTML ships in the
 * default language and switches after mount. That keeps every page cacheable as
 * a static file — the alternative, a `/[locale]/` segment on every route, would
 * triple the build for what is only interface chrome.
 */
const LanguageContext = createContext<{
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: StringKey) => string;
}>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => translate(DEFAULT_LANG, key),
});

const STORAGE_KEY = "passoff:lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(DEFAULT_LANG);

  // Restore after mount rather than during render, so the server and client
  // produce identical first output and hydration stays clean.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && saved in HTML_LANG) setLangState(saved as LangCode);
    } catch {
      // storage unavailable — the default language is used
    }
  }, []);

  // Keep the document's lang attribute honest: it drives font selection for
  // CJK text and is what screen readers announce.
  useEffect(() => {
    document.documentElement.lang = HTML_LANG[lang];
  }, [lang]);

  const setLang = useCallback((next: LangCode) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // preference simply won't persist between visits
    }
  }, []);

  const t = useCallback((key: StringKey) => translate(lang, key), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/**
 * Translates one interface string inside a server component.
 *
 * Server pages stay server components; only the text node itself is client-side,
 * which keeps the static output intact while letting the copy follow the
 * language choice.
 */
export function T({
  k,
  count,
  vars,
}: {
  k: StringKey;
  /** Prefixes the string with a number, for "5 lessons". */
  count?: number;
  /** Fills {placeholders} inside the string, for "Lesson {n}". */
  vars?: Record<string, string | number>;
}) {
  const { lang, t } = useLanguage();
  if (vars) return <>{translateFormat(lang, k, vars)}</>;
  return <>{count === undefined ? t(k) : `${count} ${t(k)}`}</>;
}
