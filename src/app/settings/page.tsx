"use client";

import React, { useEffect, useState } from "react";
import { mutate as globalMutate } from "swr";
import {
  Globe,
  KeyRound,
  Cpu,
  Zap,
  User,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/components/providers/AppProvider";
import { SUPPORTED_LANGUAGES } from "@/lib/utils";
import { hasLocalAICachedFlag, isLocalAIReady } from "@/lib/runanywhere";

export default function SettingsPage() {
  const {
    cook,
    refreshCook,
    lang,
    setLang,
    dict,
    aiTier,
    geminiConfigured,
    aiStatusLoading,
    chooseLocalAI,
    chooseBasicMode,
    setAISetupOpen,
    showToast,
  } = useApp();

  const [cookName, setCookName] = useState("Sunita Devi");
  const [cookPhone, setCookPhone] = useState("+91 98765 43210");
  const [defaultPrice, setDefaultPrice] = useState("3000");
  const [savingProfile, setSavingProfile] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (cook) {
      setCookName(cook.name);
      setCookPhone(cook.phone);
      setDefaultPrice(String(cook.defaultPrice));
    }
  }, [cook]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/cook", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cookName,
          phone: cookPhone,
          defaultPrice: Number(defaultPrice),
          language: lang,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      refreshCook();
      showToast(dict.settings.saved, "success");
    } catch {
      showToast("Failed to save settings", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleExportData = async () => {
    try {
      const [custRes, payRes, msgRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/payments"),
        fetch("/api/messages"),
      ]);
      const payload = {
        exportedAt: new Date().toISOString(),
        cook,
        customers: (await custRes.json()).customers,
        payments: (await payRes.json()).payments,
        messages: (await msgRes.json()).messages,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rasoisaathi-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Backup exported!", "success");
    } catch {
      showToast("Export failed", "error");
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm("Reset all demo customers, payments, and messages?")) return;
    setResetting(true);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (!res.ok) throw new Error("Reset failed");
      await Promise.all([
        globalMutate("/api/cook"),
        globalMutate("/api/tally"),
        globalMutate("/api/customers"),
        globalMutate("/api/payments"),
        globalMutate("/api/messages"),
      ]);
      showToast("Demo data restored!", "success");
    } catch {
      showToast("Reset failed", "error");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-full">
      <Header title={`⚙️ ${dict.settings.title}`} subtitle="Language, AI & Kitchen Profile" />

      <div className="px-4 space-y-4 pb-4">
        {/* Language Picker */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#F97316]" />
              <h2 className="text-sm font-bold text-[#1C1917]">{dict.settings.language}</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SUPPORTED_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => void setLang(l.code)}
                  className={`min-h-[48px] rounded-2xl border px-2 py-2 text-center transition-all ${
                    lang === l.code
                      ? "border-[#F97316] bg-orange-50 text-[#EA580C] font-bold shadow-sm"
                      : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <span className="block text-sm font-bold">{l.nativeName}</span>
                  <span className="block text-[10px] text-[#78716C]">{l.name}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI availability */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#7C3AED]" />
                <h2 className="text-sm font-bold text-[#1C1917]">{dict.settings.aiSetup}</h2>
              </div>
              {aiTier === "gemini" ? (
                <Badge variant="success">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </Badge>
              ) : aiTier === "local" ? (
                <Badge variant="violet">
                  <Cpu className="w-3.5 h-3.5" /> Local AI
                </Badge>
              ) : (
                <Badge variant="warning">
                  <AlertTriangle className="w-3.5 h-3.5" /> Basic Mode
                </Badge>
              )}
            </div>

            {!aiStatusLoading && !geminiConfigured && (
              <div className="space-y-2.5">
                <p className="text-sm text-stone-600">{dict.aiBanner.notConfiguredTitle}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={aiTier === "local" ? "accent" : "outline"}
                    onClick={() => {
                      if (isLocalAIReady() || hasLocalAICachedFlag()) {
                        chooseLocalAI();
                      } else {
                        setAISetupOpen(true);
                      }
                    }}
                  >
                    <Cpu className="w-4 h-4" />
                    Use Local AI
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={aiTier === "basic" ? "primary" : "outline"}
                    onClick={chooseBasicMode}
                  >
                    <Zap className="w-4 h-4" />
                    Basic Mode
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cook Profile & Business Settings */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-[#F97316]" />
              <h2 className="text-sm font-bold text-[#1C1917]">{dict.settings.cookProfile}</h2>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Your Name
                </label>
                <Input
                  value={cookName}
                  onChange={(e) => setCookName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Phone
                  </label>
                  <Input
                    value={cookPhone}
                    onChange={(e) => setCookPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Default Price (₹)
                  </label>
                  <Input
                    type="number"
                    min={100}
                    value={defaultPrice}
                    onChange={(e) => setDefaultPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={savingProfile}>
                {savingProfile ? "Saving..." : dict.settings.save}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardContent className="p-4 space-y-2.5">
            <h2 className="text-sm font-bold text-[#1C1917]">{dict.settings.data}</h2>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => void handleExportData()}>
                <Download className="w-4 h-4" />
                {dict.settings.exportData}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleResetDemo()}
                disabled={resetting}
              >
                <RotateCcw className="w-4 h-4" />
                {resetting ? "Resetting..." : dict.settings.resetDemo}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
