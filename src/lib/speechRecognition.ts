/**
 * Web Speech API (STT) & Pronunciation Evaluation Engine.
 *
 * Provides native, zero-server-cost browser speech recognition and real-time
 * pronunciation & syntax accuracy scoring against target sentences.
 *
 * Supported in Chrome, Safari, Edge, Android Chrome, and iOS Safari.
 */

// Define SpeechRecognition interface for TypeScript
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export interface WordAnalysis {
  word: string;
  matched: boolean;
}

export interface EvaluationResult {
  score: number; // 0 to 100
  rating: "excellent" | "good" | "almost" | "poor";
  ratingLabel: string;
  feedback: string;
  transcript: string;
  targetText: string;
  wordAnalysis: WordAnalysis[];
  matchedCount: number;
  totalWords: number;
}

/**
 * Normalizes contractions and punctuation for fair comparison.
 * e.g. "I'm" <-> "i am", "don't" <-> "do not", "it's" <-> "it is"
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,?!;:"'()]/g, "")
    .replace(/\bi'm\b/g, "i am")
    .replace(/\byou're\b/g, "you are")
    .replace(/\bhe's\b/g, "he is")
    .replace(/\bshe's\b/g, "she is")
    .replace(/\bit's\b/g, "it is")
    .replace(/\bwe're\b/g, "we are")
    .replace(/\bthey're\b/g, "they are")
    .replace(/\bdon't\b/g, "do not")
    .replace(/\bdoesn't\b/g, "does not")
    .replace(/\bdidn't\b/g, "did not")
    .replace(/\bcan't\b/g, "cannot")
    .replace(/\bcouldn't\b/g, "could not")
    .replace(/\bwon't\b/g, "will not")
    .replace(/\bwouldn't\b/g, "would not")
    .replace(/\bshouldn't\b/g, "should not")
    .replace(/\bhasn't\b/g, "has not")
    .replace(/\bhaven't\b/g, "have not")
    .replace(/\bhadn't\b/g, "had not")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Levenshtein distance between two strings.
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Evaluates spoken transcript against the target model sentence.
 */
export function evaluatePronunciation(spoken: string, target: string): EvaluationResult {
  const normSpoken = normalizeText(spoken);
  const normTarget = normalizeText(target);

  if (!normSpoken) {
    return {
      score: 0,
      rating: "poor",
      ratingLabel: "음성 감지 안 됨",
      feedback: "목소리가 인식되지 않았습니다. 마이크를 확인하고 다시 말해보세요.",
      transcript: "",
      targetText: target,
      wordAnalysis: target.split(/\s+/).map((w) => ({ word: w, matched: false })),
      matchedCount: 0,
      totalWords: target.split(/\s+/).length,
    };
  }

  const targetWords = normTarget.split(/\s+/).filter(Boolean);
  const spokenWords = normSpoken.split(/\s+/).filter(Boolean);
  const originalTargetWords = target.split(/\s+/).filter(Boolean);

  const spokenSet = new Set(spokenWords);
  let matchedCount = 0;

  const wordAnalysis: WordAnalysis[] = originalTargetWords.map((origWord, idx) => {
    const cleanWord = targetWords[idx] || origWord.toLowerCase().replace(/[.,?!;:"'()]/g, "");
    const matched = spokenSet.has(cleanWord) || spokenWords.some((sw) => {
      const dist = levenshteinDistance(cleanWord, sw);
      return dist <= Math.floor(cleanWord.length * 0.3);
    });
    if (matched) matchedCount++;
    return {
      word: origWord,
      matched,
    };
  });

  const wordMatchRatio = targetWords.length > 0 ? matchedCount / targetWords.length : 0;
  const maxLen = Math.max(normTarget.length, normSpoken.length) || 1;
  const charDist = levenshteinDistance(normTarget, normSpoken);
  const charSimilarity = Math.max(0, 1 - charDist / maxLen);

  const rawScore = wordMatchRatio * 75 + charSimilarity * 25;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  let rating: EvaluationResult["rating"] = "poor";
  let ratingLabel = "다시 시도";
  let feedback = "문장을 조금 더 크고 또렷한 원어민 억양으로 읽어보세요.";

  if (score >= 90) {
    rating = "excellent";
    ratingLabel = "🌟 완벽한 발음 (Excellent!)";
    feedback = "원어민 수준의 정확한 발음과 억양입니다!";
  } else if (score >= 75) {
    rating = "good";
    ratingLabel = "👍 우수한 발음 (Good!)";
    feedback = "의사소통에 충분한 훌륭한 발음입니다. 약간의 연음만 보완해보세요.";
  } else if (score >= 50) {
    rating = "almost";
    ratingLabel = "💪 거의 맞았어요 (Almost!)";
    feedback = "빨간색으로 표시된 단어의 발음에 주의해서 다시 말해보세요.";
  }

  return {
    score,
    rating,
    ratingLabel,
    feedback,
    transcript: spoken,
    targetText: target,
    wordAnalysis,
    matchedCount,
    totalWords: originalTargetWords.length,
  };
}

export interface VoiceRecognizerHandle {
  stop: () => void;
  abort: () => void;
}

/**
 * Starts listening through Web Speech API.
 */
export function listenToSpeech({
  lang = "en-US",
  onResult,
  onInterim,
  onError,
  onEnd,
  onStart,
}: {
  lang?: string;
  onResult: (transcript: string) => void;
  onInterim?: (interim: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  onStart?: () => void;
}): VoiceRecognizerHandle | null {
  if (typeof window === "undefined") return null;

  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionClass) {
    onError?.("브라우저가 마이크 음성 인식을 지원하지 않습니다. Chrome 또는 Safari를 권장합니다.");
    return null;
  }

  try {
    const recognition = new SpeechRecognitionClass();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = "";

    recognition.onstart = () => {
      onStart?.();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (res.isFinal) {
          finalTranscript += res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }
      if (interim && onInterim) {
        onInterim(interim);
      }
      if (finalTranscript) {
        onResult(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech") {
        onError?.("음성이 감지되지 않았습니다. 다시 마이크를 켜고 말씀해보세요.");
      } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        onError?.("마이크 접근 권한이 차단되었습니다. 브라우저 주소창 왼쪽 자물쇠 아이콘을 눌러 마이크 권한을 허용해주세요.");
      } else {
        onError?.(`음성 인식 오류: ${event.error}`);
      }
    };

    recognition.onend = () => {
      onEnd?.();
    };

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      },
      abort: () => {
        try {
          recognition.abort();
        } catch {
          // ignore
        }
      },
    };
  } catch (err) {
    onError?.(err instanceof Error ? err.message : "음성 인식을 시작하지 못했습니다.");
    return null;
  }
}
