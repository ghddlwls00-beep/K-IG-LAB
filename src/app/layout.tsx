import type { Metadata } from "next";
import { LanguageProvider } from "@/components/LanguageProvider";
import { TabBar } from "@/components/TabBar";
import { getCourseTabMap, getTabs } from "@/lib/content";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PASS-OFF 영어듣기훈련 프로그램",
    template: "%s · PASS-OFF",
  },
  description:
    "English listening and speaking courseware — listening drills, sentence practice, phonics, and composition exercises.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The original kept this bar in a permanent frame; putting it in the root
  // layout is the modern equivalent — it renders once and never reloads.
  const tabs = getTabs();
  const courseTabs = getCourseTabMap();

  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-ink antialiased">
        <LanguageProvider>
          <TabBar tabs={tabs} courseTabs={courseTabs} />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
