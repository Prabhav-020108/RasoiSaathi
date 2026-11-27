"use client";

import React, { useEffect, useState } from "react";
import { Cpu, KeyRound, SkipForward, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/components/providers/AppProvider";
import { initLocalAI } from "@/lib/runanywhere";

export function AISetupModal() {
  const {
    aiSetupOpen,
    setAISetupOpen,
    chooseBasicMode,
    chooseLocalAI,
    saveGeminiKey,
    dict,
  } = useApp();

  const [showKeyForm, setShowKeyForm] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [downloadingLocal, setDownloadingLocal] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("Preparing Local AI engine...");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!aiSetupOpen) {
      setDownloadingLocal(false);
      setProgress(0);
      setProgressMsg("Preparing Local AI engine...");
      setLocalError(null);
      setShowKeyForm(false);
    }
  }, [aiSetupOpen]);

  const handleLocalSetup = async () => {
    setLocalError(null);
    setDownloadingLocal(true);
    setProgress(5);
    setProgressMsg("Initializing RunAnywhere SDK...");

    try {
      await initLocalAI((pct, msg) => {
        setProgress(pct);
        setProgressMsg(msg);
      });
      setDownloadingLocal(false);
      chooseLocalAI();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not initialize Local AI";
      setDownloadingLocal(false);
      setLocalError(msg);
    }
  };

  const handleKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    saveGeminiKey(apiKeyInput);
    setApiKeyInput("");
    setShowKeyForm(false);
  };

  return (
    <Dialog
      open={aiSetupOpen}
      onClose={() => setAISetupOpen(false)}
      title={dict.aiBanner.notConfiguredTitle}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl bg-orange-50 p-3.5 border border-orange-200">
          <AlertTriangle className="w-5 h-5 text-[#F97316] shrink-0 mt-0.5" />
          <p className="text-sm text-stone-700 leading-relaxed">
            {dict.aiBanner.notConfiguredDesc}
          </p>
        </div>

        {localError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 space-y-2.5">
            <p className="text-xs font-bold text-[#DC2626]">
              Local AI setup could not complete: {localError}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="accent"
                className="flex-1"
                onClick={() => void handleLocalSetup()}
              >
                Retry Local AI
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={chooseBasicMode}
              >
                Use Basic Mode
              </Button>
            </div>
          </div>
        )}

        {downloadingLocal ? (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm font-semibold text-[#7C3AED]">
              <span className="flex items-center gap-2 min-w-0">
                <Cpu className="w-4 h-4 animate-spin shrink-0" />
                <span className="truncate">{progressMsg}</span>
              </span>
              <span className="shrink-0 ml-2">{progress}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-violet-200 overflow-hidden">
              <div
                className="h-full bg-[#7C3AED] transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-stone-500">
              RunAnywhere on-device mode caches SmolLM2-360M in browser storage (zero data leaves your phone).
            </p>
          </div>
        ) : showKeyForm ? (
          <form onSubmit={handleKeySubmit} className="space-y-3">
            <label className="block text-sm font-semibold text-stone-700">
              Google AI Studio Gemini API Key
            </label>
            <Input
              type="password"
              placeholder="AIza..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowKeyForm(false)}
              >
                Back
              </Button>
              <Button type="submit" variant="primary" className="flex-1">
                <CheckCircle2 className="w-4 h-4" />
                Save Key
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => void handleLocalSetup()}
              className="w-full text-left rounded-2xl border-2 border-violet-200 bg-violet-50/70 hover:bg-violet-100/70 p-4 transition-colors min-h-[64px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shrink-0">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-[#1C1917] text-sm">
                    {dict.aiBanner.setupLocal} (~386 MB)
                  </p>
                  <p className="text-xs text-stone-500">
                    RunAnywhere SDK • Works offline, zero API key needed
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShowKeyForm(true)}
              className="w-full text-left rounded-2xl border-2 border-orange-200 bg-orange-50/70 hover:bg-orange-100/70 p-4 transition-colors min-h-[64px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F97316] text-white flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-[#1C1917] text-sm">
                    {dict.aiBanner.enterKey}
                  </p>
                  <p className="text-xs text-stone-500">
                    Best accuracy &amp; multilingual voice via Google AI Studio
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={chooseBasicMode}
              className="w-full text-left rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 p-4 transition-colors min-h-[60px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-stone-200 text-stone-700 flex items-center justify-center shrink-0">
                  <SkipForward className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-[#1C1917] text-sm">
                    {dict.aiBanner.skipBasic}
                  </p>
                  <p className="text-xs text-stone-500">
                    Full dashboard, customers &amp; payments without AI
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
