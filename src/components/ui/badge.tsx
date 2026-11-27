import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "saffron" | "violet" | "success" | "warning" | "danger" | "info";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default: "bg-stone-100 text-stone-700",
    saffron: "bg-orange-100 text-[#EA580C]",
    violet: "bg-violet-100 text-[#7C3AED]",
    success: "bg-green-100 text-[#16A34A]",
    warning: "bg-yellow-100 text-yellow-800",
    danger: "bg-red-100 text-[#DC2626]",
    info: "bg-blue-100 text-[#2563EB]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
