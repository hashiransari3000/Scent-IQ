import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  href = "/",
  tone = "ink",
  compact = false,
}: {
  href?: string;
  tone?: "ink" | "ivory";
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label="ScentIQ home"
      className={cn(
        "group inline-flex items-center gap-2.5",
        tone === "ivory" ? "text-ivory" : "text-ink",
      )}
    >
      <span className="relative grid size-8 place-items-center">
        <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.28"
          />
          <circle
            cx="16"
            cy="16"
            r="8.2"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.55"
            strokeDasharray="2 5"
            className="origin-center transition-transform duration-700 group-hover:rotate-90"
          />
          <circle cx="16" cy="16" r="3.2" fill="var(--color-amber)" />
        </svg>
      </span>
      <span className="flex items-baseline leading-none">
        <span className="font-display text-[1.45rem] tracking-[-0.04em]">Scent</span>
        <span className="ml-0.5 font-sans text-[0.62rem] font-semibold tracking-[0.2em] text-amber">
          IQ
        </span>
      </span>
      {!compact && (
        <span
          className={cn(
            "ml-2 hidden border-l pl-2 text-[0.58rem] uppercase tracking-[0.18em] lg:block",
            tone === "ivory" ? "border-ivory/20 text-ivory/50" : "border-ink/15 text-ink/45",
          )}
        >
          Scent intelligence
        </span>
      )}
    </Link>
  );
}
