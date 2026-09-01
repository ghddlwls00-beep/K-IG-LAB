"use client";

import Link from "next/link";
import type { Tab } from "@/lib/types";
import { T, useLanguage } from "./LanguageProvider";

/**
 * The home page's list of sections.
 *
 * Courses whose *material* is in the selected language come first. The Chinese
 * course is the same curriculum taught in Chinese, so a reader who has chosen
 * Chinese should meet it before the English sections — but nothing is hidden,
 * because the English material is still the bulk of the archive and a language
 * choice is not a filter.
 */
export function TabList({ tabs }: { tabs: Tab[] }) {
  const { lang } = useLanguage();

  const ordered = [...tabs].sort((a, b) => {
    const aMatch = a.contentLang === lang ? 0 : 1;
    const bMatch = b.contentLang === lang ? 0 : 1;
    return aMatch - bMatch;
  });

  return (
    <ol className="border-t border-line">
      {ordered.map((tab, i) => (
        <li key={tab.slug} className="border-b border-line">
          <Link
            href={`/t/${tab.slug}`}
            className="group flex items-baseline gap-5 py-5 hover:bg-raised focus-visible:bg-raised"
          >
            <span className="w-7 shrink-0 pl-1 font-mono text-[11px] tabular-nums text-ink-faint">
              {String(i + 1).padStart(2, "0")}
            </span>

            <span className="flex-1">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[17px] font-medium tracking-tight">{tab.label}</span>
                {tab.contentLang === lang ? (
                  <span className="rounded-sm bg-ink px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-surface uppercase">
                    <T k="tab.inYourLanguage" />
                  </span>
                ) : null}
                {tab.unavailable ? (
                  <span className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-ink-faint uppercase">
                    <T k="tab.archiveOnly" />
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block max-w-md text-[13.5px] leading-relaxed text-ink-soft">
                {tab.blurb}
              </span>
            </span>

            <span
              aria-hidden
              className="pr-1 font-mono text-sm text-ink-faint transition-transform duration-200 ease-out group-hover:translate-x-1 group-hover:text-ink"
            >
              →
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
