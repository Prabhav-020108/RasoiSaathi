"use client";

import React from "react";
import Link from "next/link";
import { UserPlus, MessageSquare, IndianRupee, Megaphone } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";

export function QuickActions() {
  const { dict } = useApp();

  const actions = [
    {
      href: "/customers?add=1",
      label: "Add Customer",
      icon: UserPlus,
      cls: "bg-orange-100 text-[#EA580C]",
    },
    {
      href: "/messages",
      label: "WhatsApp",
      icon: MessageSquare,
      cls: "bg-violet-100 text-[#7C3AED]",
    },
    {
      href: "/payments",
      label: "Payments",
      icon: IndianRupee,
      cls: "bg-green-100 text-[#16A34A]",
    },
    {
      href: "/menu",
      label: "Menu",
      icon: Megaphone,
      cls: "bg-blue-100 text-[#2563EB]",
    },
  ];

  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716C] mb-2 px-1">
        {dict.quickActions}
      </h3>
      <div className="grid grid-cols-4 gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center justify-center rounded-2xl bg-white border border-orange-100 p-2.5 shadow-sm hover:border-orange-200 active:scale-95 transition-transform min-h-[76px]"
            >
              <span
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 ${action.cls}`}
              >
                <Icon className="w-5 h-5" />
              </span>
              <span className="text-[11px] font-bold text-[#1C1917] text-center leading-tight">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
