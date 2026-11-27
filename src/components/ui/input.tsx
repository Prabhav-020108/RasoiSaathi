import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full min-h-[48px] rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-base text-[#1C1917] placeholder:text-stone-400 focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
