"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChoiceChip({
  selected = false,
  tone = "ink",
  showCheck = false,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  tone?: "ink" | "rose";
  showCheck?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[0.76rem] font-medium transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory",
        selected
          ? tone === "rose"
            ? "border-rose/60 bg-rose/12 text-rose-deep"
            : "border-ink bg-ink text-ivory"
          : "border-ink/12 bg-ivory-soft text-ink/65 hover:border-ink/30 hover:text-ink",
        className,
      )}
      {...props}
    >
      {showCheck && selected && <Check className="size-3" strokeWidth={2.4} />}
      {children}
    </button>
  );
}
