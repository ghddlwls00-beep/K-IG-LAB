"use client";

import { useEffect, useRef, useState } from "react";
import {
  evaluatePronunciation,
  isSpeechRecognitionSupported,
  listenToSpeech,
  type EvaluationResult,
  type VoiceRecognizerHandle,
} from "@/lib/speechRecognition";

export interface VoiceSpeakingTesterProps {
  targetText: string;
  onSuccess?: (transcript: string, score: number) => void;
  compact?: boolean;
  buttonLabel?: string;
}

export function VoiceSpeakingTester({
  targetText,
  onSuccess,
  compact = false,
  buttonLabel = "마이크로 발음 테스트",
}: VoiceSpeakingTesterProps) {
  const [supported, setSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognizerRef = useRef<VoiceRecognizerHandle | null>(null);

  useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
  }, []);

  useEffect(() => {
    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.abort();
      }
    };
  }, []);

  function handleStartListening() {
    if (isListening) {
      handleStopListening();
      return;
    }
    setErrorMessage(null);
    setInterimText("");
    setResult(null);

    const handle = listenToSpeech({
      lang: "en-US",
      onStart: () => {
        setIsListening(true);
      },
      onInterim: (interim) => {
        setInterimText(interim);
      },
      onResult: (transcript) => {
        setIsListening(false);
        const evalResult = evaluatePronunciation(transcript, targetText);
        setResult(evalResult);
        if (onSuccess) {
          onSuccess(transcript, evalResult.score);
        }
      },
      onError: (err) => {
        setIsListening(false);
        setErrorMessage(err);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });
    recognizerRef.current = handle;
  }

  function handleStopListening() {
    if (recognizerRef.current) {
      recognizerRef.current.stop();
    }
    setIsListening(false);
  }

  function handleReset() {
    setResult(null);
    setInterimText("");
    setErrorMessage(null);
    handleStartListening();
  }

  if (!supported) {
    return (
      <div className="text-[11px] text-ink-faint">
        (마이크 음성 인식이 지원되지 않는 브라우저입니다. Chrome 또는 Safari를 권장합니다.)
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Trigger & Status Button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleStartListening}
          className={
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all cursor-pointer select-none " +
            (isListening
              ? "border-red-500 bg-red-500/10 text-red-600 animate-pulse ring-2 ring-red-500/30"
              : result
              ? result.score >= 80
                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
                : "border-amber-500/60 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20"
              : "border-line bg-surface text-ink-soft hover:border-ink hover:text-ink hover:bg-raised")
          }
          title="마이크를 누르고 영어 문장을 소리내어 말해보세요."
        >
          <span className={isListening ? "animate-bounce" : ""}>
            {isListening ? "⏹️" : "🎙️"}
          </span>
          <span>
            {isListening
              ? "듣고 있는 중... (말씀하세요)"
              : result
              ? `${result.score}점 (${result.ratingLabel})`
              : buttonLabel}
          </span>
        </button>

        {result && (
          <button
            type="button"
            onClick={handleReset}
            className="text-[11.5px] text-ink-faint hover:text-ink px-1.5 py-1 rounded hover:bg-raised transition-colors cursor-pointer"
            title="다시 말하기"
          >
            ↺ 다시 녹음
          </button>
        )}
      </div>

      {/* Listening State Preview */}
      {isListening && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.04] p-3 text-[13px] text-ink animate-in fade-in duration-200">
          <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
          <div className="flex-1">
            <span className="text-ink-soft font-mono text-[11px] block">실시간 음성 인식:</span>
            <span className="font-semibold text-ink italic">
              {interimText || "지금 영어로 말씀하세요..."}
            </span>
          </div>
          <button
            type="button"
            onClick={handleStopListening}
            className="rounded bg-red-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-600"
          >
            완료
          </button>
        </div>
      )}

      {/* Error Notice */}
      {errorMessage && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-[12px] text-amber-800">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Evaluation Results Card */}
      {result && !isListening && (
        <div
          className={
            "flex flex-col gap-2 rounded-xl border p-3.5 transition-all text-[13px] " +
            (result.score >= 85
              ? "border-emerald-500/40 bg-emerald-500/[0.03]"
              : result.score >= 60
              ? "border-amber-500/40 bg-amber-500/[0.03]"
              : "border-red-500/40 bg-red-500/[0.03]")
          }
        >
          {/* Header & Score Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={
                  "flex items-center justify-center rounded-lg px-2.5 py-0.5 font-mono text-[13px] font-bold " +
                  (result.score >= 85
                    ? "bg-emerald-500 text-white"
                    : result.score >= 60
                    ? "bg-amber-500 text-white"
                    : "bg-red-500 text-white")
                }
              >
                {result.score}점
              </span>
              <span className="font-semibold text-ink text-[13px]">
                {result.ratingLabel}
              </span>
            </div>
            <span className="font-mono text-[11px] text-ink-faint">
              단어 일치 {result.matchedCount}/{result.totalWords}
            </span>
          </div>

          {/* User Spoken Transcript */}
          <div className="rounded-lg bg-surface p-2 border border-line/60">
            <span className="text-[11px] text-ink-faint block">인식된 내 음성:</span>
            <p className="font-medium text-ink italic mt-0.5">
              &quot;{result.transcript}&quot;
            </p>
          </div>

          {/* Word-by-word Match Highlight */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-ink-faint">단어별 발음 일치도:</span>
            <div className="flex flex-wrap items-center gap-1 font-medium text-[13.5px]">
              {result.wordAnalysis.map((item, idx) => (
                <span
                  key={idx}
                  className={
                    "rounded px-1.5 py-0.5 transition-colors " +
                    (item.matched
                      ? "bg-emerald-500/15 text-emerald-700 font-semibold"
                      : "bg-red-500/15 text-red-600 line-through opacity-80")
                  }
                  title={item.matched ? "정확히 일치한 발음" : "인식되지 않았거나 발음이 다른 단어"}
                >
                  {item.word}
                </span>
              ))}
            </div>
          </div>

          {/* Pedagogical Feedback */}
          <p className="text-[12px] text-ink-soft border-t border-line/40 pt-1.5 mt-0.5">
            💡 {result.feedback}
          </p>
        </div>
      )}
    </div>
  );
}
