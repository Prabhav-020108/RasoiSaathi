"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceState = "idle" | "listening" | "speaking" | "error";

interface BrowserSpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: BrowserSpeechRecognitionAlternative;
}

interface BrowserSpeechRecognitionResultList {
  length: number;
  [index: number]: BrowserSpeechRecognitionResult;
}

interface BrowserSpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: BrowserSpeechRecognitionResultList;
}

interface BrowserSpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface BrowserSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((ev: Event) => void) | null;
  onspeechstart: ((ev: Event) => void) | null;
  onresult: ((ev: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((ev: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: ((ev: Event) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export const SPEECH_LOCALE_MAP: Record<string, string> = {
  hi: "hi-IN",
  en: "en-IN",
  kn: "kn-IN",
  ta: "ta-IN",
  te: "te-IN",
  mr: "mr-IN",
};

export function getSpeechLocale(lang: string): string {
  return SPEECH_LOCALE_MAP[lang] ?? "hi-IN";
}

function getFriendlyErrorMessage(code: string, lang: string): string {
  if (code === "not-allowed" || code === "service-not-allowed") {
    if (lang === "en") return "Please allow microphone permission, or type your command below.";
    if (lang === "kn") return "ದಯವಿಟ್ಟು ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿ ನೀಡಿ, ಅಥವಾ ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ.";
    return "Mic ki permission dein, ya neeche type karke kaam karein.";
  }
  if (code === "no-speech" || code === "silence-timeout") {
    if (lang === "en") return "No speech detected. Tap mic and try again?";
    if (lang === "kn") return "ಧ್ವನಿ ಕೇಳಿಸಲಿಲ್ಲ. ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸುವಿರಾ?";
    return "Kuch sunai nahi diya. Phir se bolein?";
  }
  if (code === "audio-capture") {
    if (lang === "en") return "No microphone found. You can type your command below.";
    return "Mic connect nahi hai. Neeche type karke command bhejein.";
  }
  if (code === "network") {
    if (lang === "en") return "Voice recognition needs internet. Try typing below.";
    return "Voice recognition ke liye internet chahiye. Neeche type karein.";
  }
  if (lang === "en") return "Could not capture voice clearly. Please try again.";
  return "Didi, aawaz saaf nahi aayi. Ek baar phir bolein?";
}

export interface UseVoiceOptions {
  lang?: string;
  kitchen?: boolean;
  onFinalTranscript?: (transcript: string, confidence: number) => void;
  onRecognitionFailure?: (code: string) => void;
}

export function useVoice(options: UseVoiceOptions = {}) {
  const lang = options.lang ?? "hi";
  const kitchen = options.kitchen ?? false;
  const onFinalTranscriptRef = useRef(options.onFinalTranscript);
  onFinalTranscriptRef.current = options.onFinalTranscript;
  const onFailureRef = useRef(options.onRecognitionFailure);
  onFailureRef.current = options.onRecognitionFailure;

  const [isSTTSupported, setIsSTTSupported] = useState(false);
  const [isTTSSupported, setIsTTSSupported] = useState(false);
  const [status, setStatus] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [confidence, setConfidence] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ttsSafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalCapturedRef = useRef(false);
  const latestTranscriptRef = useRef("");
  const finishSpeakingRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsSTTSupported(
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
    setIsTTSSupported("speechSynthesis" in window);
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    const ownedSpeech = Boolean(finishSpeakingRef.current);
    finishSpeakingRef.current?.();
    finishSpeakingRef.current = null;
    if (ttsSafetyTimerRef.current) {
      clearTimeout(ttsSafetyTimerRef.current);
      ttsSafetyTimerRef.current = null;
    }
    if (ownedSpeech && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore TTS cancel errors
      }
    }
    setStatus((prev) => (prev === "speaking" ? "idle" : prev));
  }, []);

  const stopListening = useCallback(() => {
    clearTimers();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
  }, [clearTimers]);

  const cancelListening = useCallback(() => {
    clearTimers();
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      rec.onstart = null;
      rec.onspeechstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch {
        // Ignore abort errors
      }
    }
    setInterimTranscript("");
    setElapsedSeconds(0);
    setStatus("idle");
  }, [clearTimers]);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return false;
    if (!kitchen && document.documentElement.hasAttribute("data-kitchen-mode")) return false;

    const SpeechCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechCtor) {
      const msg =
        lang === "en"
          ? "Voice mic works best in Chrome or Edge. Use text input below."
          : lang === "kn"
            ? "ಧ್ವನಿ ಮೈಕ್ Chrome ಅಥವಾ Edge ನಲ್ಲಿ ಉತ್ತಮವಾಗಿ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ. ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ."
            : "Best experience Chrome ya Edge mein milega. Abhi neeche type karke kaam karein.";
      setError(msg);
      setStatus("error");
      return false;
    }

    stopSpeaking();
    cancelListening();

    setError(null);
    setTranscript("");
    setInterimTranscript("");
    setConfidence(1);
    setElapsedSeconds(0);
    finalCapturedRef.current = false;
    latestTranscriptRef.current = "";

    const recognition = new SpeechCtor();
    recognition.lang = getSpeechLocale(lang);
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      if (recognitionRef.current !== recognition) return;
      setStatus("listening");
      const startedAt = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
      }, 500);

      silenceTimerRef.current = setTimeout(() => {
        if (recognitionRef.current !== recognition) return;
        if (!latestTranscriptRef.current.trim()) {
          setError(getFriendlyErrorMessage("silence-timeout", lang));
          setStatus("error");
          try {
            recognition.stop();
          } catch {
            // ignore
          }
        }
      }, 6500);
    };

    recognition.onspeechstart = () => {
      if (recognitionRef.current !== recognition) return;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };

    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) return;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      let interim = "";
      let finalText = "";
      let bestConf = 1;

      for (let i = 0; i < event.results.length; i += 1) {
        const res = event.results[i];
        const alt = res[0];
        if (!alt) continue;
        if (res.isFinal) {
          finalText += alt.transcript + " ";
          if (typeof alt.confidence === "number" && alt.confidence > 0) {
            bestConf = alt.confidence;
          }
        } else {
          interim += alt.transcript;
        }
      }

      const trimmedFinal = finalText.trim();
      const trimmedInterim = interim.trim();
      latestTranscriptRef.current = trimmedFinal || trimmedInterim;
      setInterimTranscript(trimmedInterim);

      if (trimmedFinal && !finalCapturedRef.current) {
        finalCapturedRef.current = true;
        setTranscript(trimmedFinal);
        setInterimTranscript("");
        setConfidence(bestConf);
        // Detach the recognizer before executing or speaking a reply. Late
        // events must never submit a second command or capture our own TTS.
        cancelListening();
        onFinalTranscriptRef.current?.(trimmedFinal, bestConf);
      }
    };

    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) return;
      cancelListening();
      if (event.error === "aborted") {
        setStatus("idle");
        return;
      }
      setError(getFriendlyErrorMessage(event.error, lang));
      setStatus("error");
      onFailureRef.current?.(event.error);
    };

    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      clearTimers();
      recognitionRef.current = null;
      setInterimTranscript("");
      if (!finalCapturedRef.current && latestTranscriptRef.current.trim()) {
        // An interim hypothesis isn't a confirmed transcript: don't mutate
        // customer data based on a partial phrase after recognition stops.
        setError(getFriendlyErrorMessage("unknown", lang));
        setStatus("error");
        return;
      }
      if (!finalCapturedRef.current) {
        setError(getFriendlyErrorMessage("no-speech", lang));
        setStatus("error");
        return;
      }
      setStatus((prev) => (prev === "listening" ? "idle" : prev));
    };

    try {
      setStatus("listening");
      recognition.start();
      return true;
    } catch {
      cancelListening();
      setError(getFriendlyErrorMessage("unknown", lang));
      setStatus("error");
      onFailureRef.current?.("start-failed");
      return false;
    }
  }, [cancelListening, clearTimers, kitchen, lang, stopSpeaking]);

  const speak = useCallback(
    (text: string, langOverride?: string): Promise<void> => {
      return new Promise((resolve) => {
        if (
          typeof window === "undefined" ||
          !("speechSynthesis" in window) ||
          !text.trim() ||
          (!kitchen && document.documentElement.hasAttribute("data-kitchen-mode"))
        ) {
          resolve();
          return;
        }

        try {
          cancelListening();
          stopSpeaking();

          const utterance = new SpeechSynthesisUtterance(text);
          const targetLocale = getSpeechLocale(langOverride ?? lang);
          utterance.lang = targetLocale;
          utterance.rate = 0.96;
          utterance.pitch = 1.0;

          const voices = window.speechSynthesis.getVoices();
          const langPrefix = targetLocale.split("-")[0].toLowerCase();
          const matchedVoice =
            voices.find((v) => v.lang.toLowerCase() === targetLocale.toLowerCase()) ||
            voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
          if (matchedVoice) {
            utterance.voice = matchedVoice;
          }

          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            utterance.onstart = null;
            utterance.onend = null;
            utterance.onerror = null;
            finishSpeakingRef.current = null;
            if (ttsSafetyTimerRef.current) {
              clearTimeout(ttsSafetyTimerRef.current);
              ttsSafetyTimerRef.current = null;
            }
            setStatus((prev) => (prev === "speaking" ? "idle" : prev));
            resolve();
          };

          utterance.onstart = () => setStatus("speaking");
          utterance.onend = finish;
          utterance.onerror = finish;
          finishSpeakingRef.current = finish;

          setStatus("speaking");
          // Safety fallback in case browser speechSynthesis hangs without firing onend
          ttsSafetyTimerRef.current = setTimeout(finish, Math.max(6000, text.length * 140));
          window.speechSynthesis.speak(utterance);
        } catch {
          setStatus("idle");
          resolve();
        }
      });
    },
    [cancelListening, kitchen, lang, stopSpeaking]
  );

  const clearError = useCallback(() => {
    setError(null);
    setStatus((prev) => (prev === "error" ? "idle" : prev));
  }, []);

  useEffect(() => {
    if (kitchen) return;
    const releaseAudio = () => {
      cancelListening();
      stopSpeaking();
    };
    window.addEventListener("kitchen-mode-start", releaseAudio);
    return () => window.removeEventListener("kitchen-mode-start", releaseAudio);
  }, [cancelListening, kitchen, stopSpeaking]);

  useEffect(() => {
    return () => {
      clearTimers();
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      if (rec) {
        rec.onstart = null;
        rec.onspeechstart = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        try {
          rec.abort();
        } catch {
          // ignore
        }
      }
      if (ttsSafetyTimerRef.current) {
        clearTimeout(ttsSafetyTimerRef.current);
      }
      const ownedSpeech = Boolean(finishSpeakingRef.current);
      finishSpeakingRef.current?.();
      if (ownedSpeech && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [clearTimers]);

  return {
    isSTTSupported,
    isTTSSupported,
    status,
    transcript,
    interimTranscript,
    confidence,
    error,
    elapsedSeconds,
    startListening,
    stopListening,
    cancelListening,
    speak,
    stopSpeaking,
    clearError,
  };
}
