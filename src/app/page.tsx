import { T } from "@/components/LanguageProvider";
import { TabList } from "@/components/TabList";
import { getTabs } from "@/lib/content";

export default function Home() {
  const tabs = getTabs();

  return (
    <main className="mx-auto max-w-4xl px-5 py-20">
      <header className="mb-16">
        <p className="mb-4 font-mono text-[11px] tracking-[0.25em] text-ink-faint uppercase">
          <T k="site.subtitle" />
        </p>
        <h1 className="max-w-xl text-[2.6rem] leading-[1.08] font-medium tracking-tight text-balance">
          PASS&#8209;OFF
        </h1>
        <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink-soft">
          <T k="site.tagline" />
        </p>
      </header>

      <TabList tabs={tabs} />
    </main>
  );
}
