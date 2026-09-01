/**
 * Interface translations.
 *
 * Scope is deliberate: this translates the *interface* — navigation, buttons,
 * labels — not the courseware. The lessons are English-language teaching
 * material with Korean scripts and glossaries, and machine-translating that
 * would corrupt the thing being taught. What a Japanese or Chinese speaker
 * needs is to be able to operate the app; the drills stay as written.
 *
 * Adding a language is one entry in LANGUAGES plus one block in STRINGS.
 */

export const LANGUAGES = [
  { code: "en", label: "English", endonym: "English" },
  { code: "ja", label: "Japanese", endonym: "日本語" },
  { code: "zh", label: "Chinese", endonym: "中文" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];
export const DEFAULT_LANG: LangCode = "en";

/** BCP-47 tags for the document's lang attribute. */
export const HTML_LANG: Record<LangCode, string> = {
  en: "en",
  ja: "ja",
  zh: "zh-Hans",
};

export const STRINGS = {
  en: {
    "site.tagline": "Listening, speaking and composition courseware — the original ten sections, rebuilt to run without a plugin.",
    "site.subtitle": "English listening training program",
    "nav.allSections": "All sections",
    "nav.language": "Language",
    "tab.archiveOnly": "archive only",
    "tab.inYourLanguage": "in 中文",
    "tab.unavailable": "Not available on the web",
    "tab.contained": "What it contained",
    "tab.drills": "drills",
    "tab.conversation": "conversation",
    "tab.video": "video",
    "course.lesson": "lesson",
    "course.lessons": "lessons",
    "course.group": "group",
    "course.groups": "groups",
    "course.scriptsPaired": "Korean scripts, paired",
    "course.scriptPaired": "Korean script, paired",
    "lesson.numbered": "Lesson {n}",
    "lesson.viewScript": "View the Korean script",
    "lesson.backToDrill": "Back to the listening drill",
    "lesson.koreanScript": "Korean script",
    "lesson.notMigrated": "This lesson's content has not been migrated yet.",
    "lesson.tracksRecovered": "audio tracks recovered from the original Flash lesson",
    "lesson.trackRecovered": "audio track recovered from the original Flash lesson",
    "lesson.source": "source",
    "lesson.transcript": "Transcript",
    "lesson.glossary": "Vocabulary",
    "player.play": "Play",
    "player.pause": "Pause",
    "player.seek": "Seek",
    "player.speed": "Speed",
    "player.back5": "Back 5 seconds",
    "player.missingAudio": "Audio for this lesson has not been migrated yet.",
    "player.fullLesson": "Full lesson",
    "player.clip": "Clip",
    "player.listen": "Listen",
    "answer.title": "Your answer",
    "answer.chooseOne": "Choose one",
    "answer.dictation": "Dictation",
    "answer.placeholder": "Type what you hear…",
    "answer.saved": "Saved in this browser",
    "answer.localOnly": "Your work is kept in this browser only",
    "answer.clear": "Clear",
    "vocabulary": "Vocabulary",
  },
  ja: {
    "site.tagline": "リスニング・スピーキング・作文の教材。オリジナルの10セクションを、プラグインなしで動くように再構築しました。",
    "site.subtitle": "英語リスニング訓練プログラム",
    "nav.allSections": "すべてのセクション",
    "nav.language": "言語",
    "tab.archiveOnly": "アーカイブのみ",
    "tab.inYourLanguage": "中国語",
    "tab.unavailable": "ウェブでは利用できません",
    "tab.contained": "収録内容",
    "tab.drills": "ドリル",
    "tab.conversation": "会話",
    "tab.video": "動画",
    "course.lesson": "レッスン",
    "course.lessons": "レッスン",
    "course.group": "グループ",
    "course.groups": "グループ",
    "course.scriptsPaired": "韓国語スクリプト（対応付け済み）",
    "course.scriptPaired": "韓国語スクリプト（対応付け済み）",
    "lesson.numbered": "レッスン {n}",
    "lesson.viewScript": "韓国語スクリプトを見る",
    "lesson.backToDrill": "リスニング練習に戻る",
    "lesson.koreanScript": "韓国語スクリプト",
    "lesson.notMigrated": "このレッスンの内容はまだ移行されていません。",
    "lesson.tracksRecovered": "本のオーディオを元のFlashレッスンから復元しました",
    "lesson.trackRecovered": "本のオーディオを元のFlashレッスンから復元しました",
    "lesson.source": "出典",
    "lesson.transcript": "スクリプト",
    "lesson.glossary": "単語",
    "player.play": "再生",
    "player.pause": "一時停止",
    "player.seek": "シーク",
    "player.speed": "速度",
    "player.back5": "5秒戻る",
    "player.missingAudio": "このレッスンの音声はまだ移行されていません。",
    "player.fullLesson": "レッスン全体",
    "player.clip": "クリップ",
    "player.listen": "聞く",
    "answer.title": "解答",
    "answer.chooseOne": "1つ選択",
    "answer.dictation": "ディクテーション",
    "answer.placeholder": "聞こえたとおりに入力…",
    "answer.saved": "このブラウザに保存しました",
    "answer.localOnly": "入力内容はこのブラウザにのみ保存されます",
    "answer.clear": "消去",
    "vocabulary": "語彙",
  },
  zh: {
    "site.tagline": "听力、口语与写作教材 —— 原有的十个板块，重建为无需插件即可运行。",
    "site.subtitle": "英语听力训练课程",
    "nav.allSections": "全部板块",
    "nav.language": "语言",
    "tab.archiveOnly": "仅存档",
    "tab.inYourLanguage": "中文教材",
    "tab.unavailable": "无法在网页上运行",
    "tab.contained": "收录内容",
    "tab.drills": "练习",
    "tab.conversation": "会话",
    "tab.video": "视频",
    "course.lesson": "课",
    "course.lessons": "课",
    "course.group": "组",
    "course.groups": "组",
    "course.scriptsPaired": "韩语文本（已配对）",
    "course.scriptPaired": "韩语文本（已配对）",
    "lesson.numbered": "第 {n} 课",
    "lesson.viewScript": "查看韩语文本",
    "lesson.backToDrill": "返回听力练习",
    "lesson.koreanScript": "韩语文本",
    "lesson.notMigrated": "本课内容尚未迁移。",
    "lesson.tracksRecovered": "段音频，来自原始 Flash 课程",
    "lesson.trackRecovered": "段音频，来自原始 Flash 课程",
    "lesson.source": "来源",
    "lesson.transcript": "文本",
    "lesson.glossary": "词汇",
    "player.play": "播放",
    "player.pause": "暂停",
    "player.seek": "进度",
    "player.speed": "速度",
    "player.back5": "后退5秒",
    "player.missingAudio": "本课音频尚未迁移。",
    "player.fullLesson": "完整课程",
    "player.clip": "片段",
    "player.listen": "聆听",
    "answer.title": "你的答案",
    "answer.chooseOne": "选择一项",
    "answer.dictation": "听写",
    "answer.placeholder": "输入你听到的内容…",
    "answer.saved": "已保存在此浏览器",
    "answer.localOnly": "你的作答仅保存在此浏览器中",
    "answer.clear": "清除",
    "vocabulary": "词汇",
  },
} as const;

export type StringKey = keyof (typeof STRINGS)["en"];

export function translate(lang: LangCode, key: StringKey): string {
  const table = STRINGS[lang] as Record<string, string>;
  return table[key] ?? (STRINGS[DEFAULT_LANG] as Record<string, string>)[key] ?? key;
}

/**
 * Fills {placeholders} in a translated string. Languages order the number
 * differently — "Lesson 6" but "第 6 课" — so the position lives in the
 * translation rather than in the calling code.
 */
export function translateFormat(
  lang: LangCode,
  key: StringKey,
  vars: Record<string, string | number>,
): string {
  return translate(lang, key).replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match,
  );
}
