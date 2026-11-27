import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      primary:
        "bg-[#F97316] text-white hover:bg-[#EA580C] active:scale-[0.98] shadow-sm",
      accent:
        "bg-[#7C3AED] text-white hover:bg-[#6D28D9] active:scale-[0.98] shadow-sm",
      outline:
        "border border-stone-200 bg-white text-[#1C1917] hover:bg-orange-50 active:scale-[0.98]",
      ghost: "bg-transparent text-[#1C1917] hover:bg-orange-100/60",
      danger: "bg-[#DC2626] text-white hover:bg-red-700 active:scale-[0.98]",
      success: "bg-[#16A34A] text-white hover:bg-green-700 active:scale-[0.98]",
    };

    const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "min-h-[40px] px-3.5 text-sm rounded-xl",
      md: "min-h-[48px] px-5 text-base rounded-2xl",
      lg: "min-h-[54px] px-6 text-base rounded-2xl",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none select-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
