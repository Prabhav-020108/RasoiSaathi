"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useSWR, { mutate as globalMutate } from "swr";
import { Mic, Plus, Search, Users } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerCard, type CustomerListItem } from "@/components/customers/CustomerCard";
import { AddCustomerForm } from "@/components/customers/AddCustomerForm";
import { useApp } from "@/components/providers/AppProvider";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load customers");
  return res.json();
};

function CustomersContent() {
  const searchParams = useSearchParams();
  const { dict, cook, showToast } = useApp();

  const { data, isLoading, mutate } = useSWR<{ customers: CustomerListItem[] }>(
    "/api/customers",
    fetcher
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "cancelled">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setAddOpen(true);
    }
  }, [searchParams]);

  const customers = useMemo(() => data?.customers ?? [], [data?.customers]);

  const counts = useMemo(() => {
    return {
      all: customers.length,
      active: customers.filter((c) => c.status === "active").length,
      paused: customers.filter((c) => c.status === "paused").length,
      cancelled: customers.filter((c) => c.status === "cancelled").length,
    };
  }, [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        c.dietaryPref.toLowerCase().includes(q)
      );
    });
  }, [customers, search, statusFilter]);

  const handleTogglePause = async (customer: CustomerListItem) => {
    setUpdatingId(customer.id);
    const nextStatus = customer.status === "paused" ? "active" : "paused";
    const pauseUntil =
      nextStatus === "paused"
        ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        : null;

    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, pauseUntil }),
      });
      if (!res.ok) throw new Error("Update failed");
      await Promise.all([mutate(), globalMutate("/api/tally")]);
      showToast(
        nextStatus === "paused"
          ? `${customer.name} paused`
          : `${customer.name} resumed`,
        "info"
      );
    } catch {
      showToast("Failed to update status", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-full">
      <Header
        title={`👥 ${dict.customers.title}`}
        subtitle={`${counts.active} active • ${counts.paused} paused`}
        rightSlot={
          <Button size="sm" onClick={() => setAddOpen(true)} className="rounded-full">
            <Plus className="w-4 h-4" />
            {dict.customers.add}
          </Button>
        }
      />

      <div className="px-4 space-y-3 pb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={dict.customers.searchPlaceholder}
              className="pl-10"
            />
          </div>
          <Link
            href="/voice?listen=1"
            aria-label="Manage customers by voice"
            className="min-h-[48px] min-w-[48px] px-3.5 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#F97316] text-white flex items-center justify-center gap-1.5 text-xs font-bold shadow-sm hover:opacity-95 active:scale-95 transition-transform shrink-0"
          >
            <Mic className="w-4 h-4" />
            <span>Voice</span>
          </Link>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(
            [
              { key: "all", label: `${dict.customers.all} (${counts.all})` },
              { key: "active", label: `${dict.customers.active} (${counts.active})` },
              { key: "paused", label: `${dict.customers.paused} (${counts.paused})` },
              { key: "cancelled", label: `${dict.customers.cancelled} (${counts.cancelled})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`min-h-[40px] px-3.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                statusFilter === tab.key
                  ? "bg-[#1C1917] text-white"
                  : "bg-white border border-orange-100 text-[#78716C] hover:bg-orange-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-28 rounded-3xl bg-white border border-orange-100 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl bg-white border border-orange-100 p-8 text-center">
            <Users className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#1C1917]">{dict.customers.empty}</p>
            <Button className="mt-4" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" />
              {dict.customers.add}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onTogglePause={handleTogglePause}
                updatingId={updatingId}
              />
            ))}
          </div>
        )}
      </div>

      <AddCustomerForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          void mutate();
          void globalMutate("/api/tally");
        }}
        defaultPrice={cook?.defaultPrice ?? 3000}
      />
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-stone-500">Loading...</div>}>
      <CustomersContent />
    </Suspense>
  );
}
