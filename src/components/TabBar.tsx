"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Tab } from "@/lib/types";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "./LanguageProvider";

/**
 * The persistent top navigation.
 *
 * In the original site this bar lived in its own frame and never reloaded — it
 * was on screen no matter which lesson you opened. Keeping it always visible is
 * the single most load-bearing piece of the old information architecture, so it
 * sits in the root layout rather than on individual pages.
 *
 * The legacy bar was ten coloured images. Here the same ten destinations are
 * text, ranked by weight and an underline that draws in on hover.
 */
export function TabBar({ tabs, courseTabs }: { tabs: Tab[]; courseTabs: Record<string, string> }) {
  const pathname = usePathname();
  const { lang } = useLanguage();

  // A course taught in the selected language leads the bar, so choosing 中文
  // actually surfaces the Chinese material rather than only relabelling menus.
  const ordered = [...tabs].sort(
    (a, b) => (a.contentLang === lang ? 0 : 1) - (b.contentLang === lang ? 0 : 1),
  );

  // A lesson page is "inside" its course's tab, so the right item stays marked
  // however deep you are.
  const segments = pathname.split("/").filter(Boolean);
  let activeTab: string | null = null;
  if (segments[0] === "t") activeTab = segments[1] ?? null;
  else if (segments[0]) activeTab = courseTabs[segments[0]] ?? null;

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/85 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex items-center gap-6 py-3">
          <Link
            href="/"
            className="shrink-0 font-mono text-[11px] tracking-[0.22em] text-ink uppercase opacity-70 hover:opacity-100"
          >
            Pass&#8209;Off
          </Link>

          <nav aria-label="Courses" className="no-scrollbar -mx-1 flex flex-1 items-center gap-0.5 overflow-x-auto">
            {ordered.map((tab) => {
              const active = activeTab === tab.slug;
              return (
                <Link
                  key={tab.slug}
                  href={`/t/${tab.slug}`}
                  aria-current={active ? "page" : undefined}
                  className={
                    "relative shrink-0 px-2.5 py-1.5 text-[12.5px] whitespace-nowrap " +
                    (active
                      ? "font-semibold text-ink"
                      : "font-normal text-ink-soft hover:text-ink")
                  }
                >
                  {tab.label}
                  <span
                    aria-hidden
                    className={
                      "absolute inset-x-2.5 -bottom-px h-px origin-left bg-ink transition-transform duration-200 ease-out " +
                      (active ? "scale-x-100" : "scale-x-0")
                    }
                  />
                </Link>
              );
            })}
          </nav>

          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
