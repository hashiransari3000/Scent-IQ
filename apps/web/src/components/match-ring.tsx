"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";

export function MatchRing({
  value,
  size = 58,
  stroke = 3.5,
  label = "match",
  className,
  tone = "light",
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
  tone?: "light" | "dark";
}) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, value)) / 100);

  return (
    <div
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
      aria-label={`${value}% ${label}`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={`ring-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E4BF7A" />
            <stop offset="100%" stopColor="#C8963E" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone === "dark" ? "rgba(245,240,230,0.18)" : "rgba(14,13,11,0.1)"}
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#ring-${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduce ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span
          className={cn(
            "font-display text-[0.98rem] leading-none",
            tone === "dark" ? "text-ivory" : "text-ink",
          )}
        >
          {Math.round(value)}
        </span>
        <span
          className={cn(
            "mt-0.5 text-[0.42rem] uppercase tracking-[0.14em]",
            tone === "dark" ? "text-ivory/55" : "text-ink/45",
          )}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
