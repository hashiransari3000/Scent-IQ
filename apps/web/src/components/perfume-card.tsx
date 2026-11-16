import { ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Perfume } from "@/lib/types";
import { cn, priceTierLabel, seasonLabel } from "@/lib/utils";
import { FamilyArt } from "./family-art";
import { MatchRing } from "./match-ring";

export function PerfumeCard({
  perfume,
  match,
  reason,
  footer,
  className,
  compact = false,
}: {
  perfume: Perfume;
  match?: number;
  reason?: string;
  footer?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const notePreview = perfume.notes.slice(0, 4).join(" · ");

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-ink/10 bg-ivory-soft card-lift",
        className,
      )}
    >
      <Link href={`/perfume/${perfume.id}`} className="flex flex-1 flex-col">
        <div className={cn("relative", compact ? "aspect-[5/4]" : "aspect-[4/5]")}>
          <FamilyArt
            slug={perfume.familySlug ?? perfume.imageKey}
            name={perfume.family}
            seed={perfume.id}
            className="absolute inset-0"
            label={false}
          />

          <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between p-3.5">
            <span className="rounded-full border border-ivory/20 bg-ink/25 px-2.5 py-1 text-[0.55rem] font-medium uppercase tracking-[0.16em] text-ivory/90 backdrop-blur-md">
              {perfume.family}
            </span>
            {typeof match === "number" && (
              <MatchRing value={match} tone="dark" size={52} stroke={3.2} className="drop-shadow" />
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 z-10 p-4">
            <p className="text-[0.56rem] uppercase tracking-[0.18em] text-ivory/55">
              {perfume.concentration}
            </p>
            <h3 className="mt-1 font-display text-[1.6rem] leading-[1.02] tracking-[-0.03em] text-ivory">
              {perfume.name}
            </h3>
            <p className="mt-1 text-[0.76rem] text-ivory/68">{perfume.house}</p>
          </div>

          <span className="absolute bottom-4 right-4 z-10 grid size-8 place-items-center rounded-full border border-ivory/25 text-ivory/80 opacity-0 transition-all duration-300 group-hover:opacity-100">
            <ArrowUpRight className="size-3.5" />
          </span>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <p className="line-clamp-2 text-[0.74rem] leading-relaxed text-ink/55">{notePreview}</p>

          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
            <span className="rounded-full bg-ink/5 px-2 py-1 text-[0.58rem] uppercase tracking-[0.12em] text-ink/55">
              {priceTierLabel(perfume.priceTier)}
            </span>
            <span className="text-[0.58rem] uppercase tracking-[0.1em] text-ink/40">
              {perfume.seasons.slice(0, 3).map(seasonLabel).join(" · ")}
            </span>
          </div>
        </div>
      </Link>

      {reason && (
        <div className="mx-3 mb-3 flex items-start gap-2 rounded-2xl bg-amber/10 px-3 py-2.5 text-[0.68rem] leading-relaxed text-ink/72">
          <Sparkles className="mt-0.5 size-3 shrink-0 text-amber-dark" />
          <span>{reason}</span>
        </div>
      )}

      {footer && <div className="mt-auto border-t border-ink/8 px-3 py-2.5">{footer}</div>}
    </article>
  );
}
