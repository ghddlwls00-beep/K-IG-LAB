import type { Metadata } from "next";
import { LanguageProvider } from "@/components/LanguageProvider";
import { TabBar } from "@/components/TabBar";
import { getCourseTabMap, getTabs } from "@/lib/content";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "K-IG교육 영어듣기 프로그램",
    template: "%s · K-IG교육",
  },
  description:
    "English listening and speaking courseware — listening drills, sentence practice, phonics, and composition exercises.",
  other: {
    google: "notranslate",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The original kept this bar in a permanent frame; putting it in the root
  // layout is the modern equivalent — it renders once and never reloads.
  const tabs = getTabs();
  const courseTabs = getCourseTabMap();

  return (
    <html lang="ko" translate="no" className="notranslate">
      <head>
        <meta name="google" content="notranslate" />
        <meta name="robots" content="notranslate" />
      </head>
      <body className="notranslate min-h-screen bg-surface text-ink antialiased" translate="no">
        <LanguageProvider>
          <TabBar tabs={tabs} courseTabs={courseTabs} />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
