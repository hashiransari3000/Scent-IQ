import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: { href: string; label: string };
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 md:flex-row md:items-end md:justify-between",
        align === "center" && "md:flex-col md:items-center md:text-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && <p className="eyebrow text-amber-dark">{eyebrow}</p>}
        <h2 className="mt-3 font-display text-[clamp(2.2rem,4.4vw,4rem)] leading-[1.02] tracking-[-0.03em]">
          {title}
        </h2>
        {description && (
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/58 md:text-[0.95rem]">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-2 text-[0.75rem] font-medium uppercase tracking-[0.16em] text-ink/65 transition hover:text-ink"
        >
          {action.label}
          <span className="grid size-7 place-items-center rounded-full border border-ink/15 transition group-hover:border-ink/40">
            <ArrowUpRight className="size-3.5" />
          </span>
        </Link>
      )}
    </div>
  );
}
