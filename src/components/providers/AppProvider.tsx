"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import useSWR from "swr";
import { getDictionary, type Dictionary } from "@/i18n";
import {
  type AITier,
  resolveEffectiveAITier,
  setStoredAIMode,
  clearLegacyGeminiKey,
} from "@/lib/ai-provider";

export interface CookProfile {
  id: string;
  name: string;
  phone: string;
  language: string;
  defaultPrice: number;
}

interface ToastState {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface AppContextValue {
  cook: CookProfile | null;
  cookLoading: boolean;
  refreshCook: () => void;
  lang: string;
  setLang: (lang: string) => Promise<void>;
  dict: Dictionary;
  aiTier: AITier;
  geminiConfigured: boolean;
  aiStatusLoading: boolean;
  needsAISetup: boolean;
  aiSetupOpen: boolean;
  setAISetupOpen: (open: boolean) => void;
  chooseBasicMode: () => void;
  chooseLocalAI: () => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { data: cookData, isLoading: cookLoading, mutate: mutateCook } = useSWR<{
    cook: CookProfile | null;
  }>("/api/cook", fetcher);

  const { data: healthData } = useSWR<{
    status: string;
    geminiConfigured: boolean;
  }>("/api/health", fetcher);

  const [lang, setLangState] = useState<string>("hi");
  const [aiTier, setAiTier] = useState<AITier>("basic");
  const [needsAISetup, setNeedsAISetup] = useState<boolean>(false);
  const [aiSetupOpen, setAISetupOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const geminiConfigured = Boolean(healthData?.geminiConfigured);

  useEffect(() => {
    if (cookData?.cook?.language) {
      setLangState(cookData.cook.language);
    } else if (typeof window !== "undefined") {
      const savedLang = window.localStorage.getItem("rasoisaathi_lang");
      if (savedLang) setLangState(savedLang);
    }
  }, [cookData?.cook?.language]);

  const syncAIState = useCallback(() => {
    const resolved = resolveEffectiveAITier(geminiConfigured);
    setAiTier(resolved.tier);
    setNeedsAISetup(Boolean(healthData) && resolved.needsSetupPrompt);
    if (geminiConfigured) setAISetupOpen(false);
  }, [geminiConfigured, healthData]);

  useEffect(() => {
    clearLegacyGeminiKey();
  }, []);

  useEffect(() => {
    syncAIState();
  }, [syncAIState]);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      const id = Date.now();
      setToast({ id, message, type });
      setTimeout(() => {
        setToast((prev) => (prev?.id === id ? null : prev));
      }, 3200);
    },
    []
  );

  const setLang = useCallback(
    async (newLang: string) => {
      setLangState(newLang);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("rasoisaathi_lang", newLang);
      }
      try {
        await fetch("/api/cook", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: newLang }),
        });
        await mutateCook();
      } catch {
        // Keep optimistic local language update
      }
    },
    [mutateCook]
  );

  const chooseBasicMode = useCallback(() => {
    setStoredAIMode("basic");
    syncAIState();
    setAISetupOpen(false);
    showToast("Basic Mode active — all local features ready", "info");
  }, [showToast, syncAIState]);

  const chooseLocalAI = useCallback(() => {
    setStoredAIMode("local");
    syncAIState();
    setAISetupOpen(false);
    showToast("Local AI (RunAnywhere) selected", "success");
  }, [showToast, syncAIState]);

  const dict = getDictionary(lang);

  return (
    <AppContext.Provider
      value={{
        cook: cookData?.cook ?? null,
        cookLoading,
        refreshCook: () => {
          void mutateCook();
        },
        lang,
        setLang,
        dict,
        aiTier,
        geminiConfigured,
        aiStatusLoading: !healthData,
        needsAISetup,
        aiSetupOpen,
        setAISetupOpen,
        chooseBasicMode,
        chooseLocalAI,
        showToast,
      }}
    >
      {children}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 w-full max-w-[380px] pointer-events-none">
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg text-white text-center ${
              toast.type === "error"
                ? "bg-[#DC2626]"
                : toast.type === "info"
                  ? "bg-[#7C3AED]"
                  : "bg-[#16A34A]"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return ctx;
}
