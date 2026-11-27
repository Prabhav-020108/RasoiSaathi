"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, Save, Trash2, CheckCircle2, Pause, Play, XCircle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DIETARY_OPTIONS, SUPPORTED_LANGUAGES, formatINR } from "@/lib/utils";
import { useApp } from "@/components/providers/AppProvider";

interface CustomerDetailResponse {
  customer: {
    id: string;
    name: string;
    phone: string | null;
    language: string;
    dietaryPref: string;
    monthlyPrice: number;
    status: string;
    pauseUntil: string | null;
    specialNotes: string | null;
    payments: Array<{
      id: string;
      month: string;
      amount: number;
      status: string;
      paidAmount: number;
    }>;
    messages: Array<{
      id: string;
      originalText: string;
      status: string;
      intent: string | null;
      createdAt: string;
    }>;
  };
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Customer not found");
  return res.json();
};

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useApp();

  const { data, isLoading, error, mutate } = useSWR<CustomerDetailResponse>(
    params.id ? `/api/customers/${params.id}` : null,
    fetcher
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("hi");
  const [dietaryPref, setDietaryPref] = useState("regular");
  const [monthlyPrice, setMonthlyPrice] = useState("3000");
  const [specialNotes, setSpecialNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (data?.customer) {
      setName(data.customer.name);
      setPhone(data.customer.phone ?? "");
      setLanguage(data.customer.language);
      setDietaryPref(data.customer.dietaryPref);
      setMonthlyPrice(String(data.customer.monthlyPrice));
      setSpecialNotes(data.customer.specialNotes ?? "");
    }
  }, [data?.customer]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          language,
          dietaryPref,
          monthlyPrice: Number(monthlyPrice),
          specialNotes,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      await mutate();
      showToast("Customer updated", "success");
    } catch {
      showToast("Failed to update customer", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: "active" | "paused" | "cancelled") => {
    try {
      const pauseUntil =
        status === "paused"
          ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          : null;
      const res = await fetch(`/api/customers/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, pauseUntil }),
      });
      if (!res.ok) throw new Error("Status update failed");
      await mutate();
      showToast(`Status set to ${status}`, "info");
    } catch {
      showToast("Could not change status", "error");
    }
  };

  const handleMarkPaid = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/payments/${paymentId}/mark-paid`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      await mutate();
      showToast("Marked as Paid ✅", "success");
    } catch {
      showToast("Could not update payment", "error");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Remove ${name} from your customer list?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${params.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showToast("Customer deleted", "info");
      router.push("/customers");
    } catch {
      showToast("Failed to delete customer", "error");
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-10 w-32 rounded-xl bg-orange-100 animate-pulse" />
        <div className="h-64 rounded-3xl bg-white animate-pulse" />
      </div>
    );
  }

  if (error || !data?.customer) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="font-bold text-[#1C1917]">Customer not found</p>
        <Link href="/customers">
          <Button variant="outline">Back to Customers</Button>
        </Link>
      </div>
    );
  }

  const { customer } = data;

  return (
    <div className="min-h-full">
      <Header
        title={customer.name}
        subtitle={`Status: ${customer.status}`}
        rightSlot={
          <Link href="/customers">
            <Button variant="outline" size="sm" className="rounded-full">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
        }
      />

      <div className="px-4 space-y-4 pb-4">
        {/* Quick status controls */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#78716C] mb-2.5">
              Subscription Status
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                size="sm"
                variant={customer.status === "active" ? "success" : "outline"}
                onClick={() => void handleStatusChange("active")}
              >
                <Play className="w-3.5 h-3.5" />
                Active
              </Button>
              <Button
                type="button"
                size="sm"
                variant={customer.status === "paused" ? "accent" : "outline"}
                onClick={() => void handleStatusChange("paused")}
              >
                <Pause className="w-3.5 h-3.5" />
                Pause
              </Button>
              <Button
                type="button"
                size="sm"
                variant={customer.status === "cancelled" ? "danger" : "outline"}
                onClick={() => void handleStatusChange("cancelled")}
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Edit Details */}
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Name
                </label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Phone
                  </label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Monthly ₹
                  </label>
                  <Input
                    type="number"
                    min={100}
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
                    className="w-full min-h-[48px] rounded-2xl border border-stone-200 bg-white px-3 text-sm font-medium"
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
                    className="w-full min-h-[48px] rounded-2xl border border-stone-200 bg-white px-3 text-sm font-medium"
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
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="Optional notes..."
                />
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardContent className="p-4 space-y-2.5">
            <h3 className="text-sm font-bold text-[#1C1917]">Payments</h3>
            {customer.payments.length === 0 ? (
              <p className="text-xs text-[#78716C]">No payment records yet.</p>
            ) : (
              customer.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-2xl bg-orange-50/50 px-3 py-2.5 border border-orange-100"
                >
                  <div>
                    <p className="text-sm font-bold text-[#1C1917]">{p.month}</p>
                    <p className="text-xs text-[#78716C]">{formatINR(p.amount)}</p>
                  </div>
                  {p.status === "paid" ? (
                    <Badge variant="success">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Paid
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => void handleMarkPaid(p.id)}
                    >
                      Mark Paid
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Button
          type="button"
          variant="outline"
          className="w-full border-red-200 text-[#DC2626] hover:bg-red-50"
          onClick={() => void handleDelete()}
          disabled={deleting}
        >
          <Trash2 className="w-4 h-4" />
          {deleting ? "Deleting..." : "Delete Customer"}
        </Button>
      </div>
    </div>
  );
}
