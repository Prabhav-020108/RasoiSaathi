"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, IndianRupee, UtensilsCrossed, Settings } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const { dict } = useApp();

  const items = [
    { href: "/", label: dict.nav.home, icon: Home, match: (p: string) => p === "/" },
    {
      href: "/customers",
      label: dict.nav.customers,
      icon: Users,
      match: (p: string) => p.startsWith("/customers"),
    },
    {
      href: "/payments",
      label: dict.nav.payments,
      icon: IndianRupee,
      match: (p: string) => p.startsWith("/payments"),
    },
    {
      href: "/menu",
      label: dict.nav.menu,
      icon: UtensilsCrossed,
      match: (p: string) => p.startsWith("/menu"),
    },
    {
      href: "/settings",
      label: dict.nav.settings,
      icon: Settings,
      match: (p: string) => p.startsWith("/settings"),
    },
  ];

  return (
    <nav
      aria-label="Primary Navigation"
      className="shrink-0 border-t border-orange-100 bg-white/95 backdrop-blur-md px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-30"
    >
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center min-h-[50px] rounded-2xl transition-colors",
                active
                  ? "text-[#F97316] bg-orange-50/90"
                  : "text-[#78716C] hover:text-[#1C1917] hover:bg-stone-50"
              )}
            >
              <Icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
              <span className={cn("text-[11px] mt-0.5", active ? "font-bold" : "font-medium")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
