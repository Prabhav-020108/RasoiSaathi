"use client";

import React, { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DIETARY_OPTIONS, SUPPORTED_LANGUAGES } from "@/lib/utils";
import { useApp } from "@/components/providers/AppProvider";

interface AddCustomerFormProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultPrice?: number;
}

export function AddCustomerForm({
  open,
  onClose,
  onCreated,
  defaultPrice = 3000,
}: AddCustomerFormProps) {
  const { showToast } = useApp();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("hi");
  const [dietaryPref, setDietaryPref] = useState("regular");
  const [monthlyPrice, setMonthlyPrice] = useState(String(defaultPrice));
  const [specialNotes, setSpecialNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setMonthlyPrice(String(defaultPrice));
      setError("");
    }
  }, [open, defaultPrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter customer name.");
      return;
    }

    const priceNum = Number(monthlyPrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError("Please enter a valid monthly price.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          language,
          dietaryPref,
          monthlyPrice: priceNum,
          specialNotes: specialNotes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add customer");
      }

      setName("");
      setPhone("");
      setSpecialNotes("");
      showToast(`${name.trim()} added!`, "success");
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Add New Customer">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-[#DC2626]">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            Customer Name *
          </label>
          <Input
            placeholder="e.g., Vikram Singh"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Phone (Optional)
            </label>
            <Input
              placeholder="+91 98..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Monthly ₹ *
            </label>
            <Input
              type="number"
              min={100}
              step={50}
              value={monthlyPrice}
              onChange={(e) => setMonthlyPrice(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Dietary Preference
            </label>
            <select
              value={dietaryPref}
              onChange={(e) => setDietaryPref(e.target.value)}
              className="w-full min-h-[48px] rounded-2xl border border-stone-200 bg-white px-3 text-sm font-medium text-[#1C1917] focus:border-[#F97316] focus:outline-none"
            >
              {DIETARY_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full min-h-[48px] rounded-2xl border border-stone-200 bg-white px-3 text-sm font-medium text-[#1C1917] focus:border-[#F97316] focus:outline-none"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            Special Notes
          </label>
          <Input
            placeholder="e.g., Less spice, extra roti"
            value={specialNotes}
            onChange={(e) => setSpecialNotes(e.target.value)}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={submitting}>
            <UserPlus className="w-4 h-4" />
            {submitting ? "Adding..." : "Add Customer"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
