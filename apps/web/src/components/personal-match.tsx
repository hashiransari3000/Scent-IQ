"use client";

import { AlertCircle, ArrowRight, Heart, Loader2, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchExplanation } from "@/lib/api";
import { hasProfile, recordFeedback, useProfile } from "@/lib/profile";
import type { MatchBreakdown, Recommendation } from "@/lib/types";
import { cn, percentage } from "@/lib/utils";
import { MatchRing } from "./match-ring";

const BARS: { key: keyof MatchBreakdown; label: string }[] = [
  { key: "content", label: "Content similarity" },
  { key: "tree", label: "Predicted enjoyment" },
  { key: "cluster", label: "Cluster affinity" },
  { key: "quality", label: "Catalogue quality" },
];

export function PersonalMatch({ perfumeId, name }: { perfumeId: string; name: string }) {
  const { profile, update } = useProfile();
  const ready = hasProfile(profile);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetchExplanation(perfumeId, profile)
      .then((result) => {
        if (!cancelled) setRecommendation(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, profile, perfumeId, attempt]);

  const feedback = profile.feedback[perfumeId];

  return (
    <div className="relative overflow-hidden rounded-[1.8rem] border border-ink/10 bg-ivory-soft p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-amber/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.58rem] uppercase tracking-[0.18em] text-ink/38">
            Your match
          </p>
          <p className="mt-2 max-w-[16rem] text-[0.78rem] leading-relaxed text-ink/50">
            {ready
              ? "Scored against your saved profile, with the reasons behind the number."
              : "Build a profile to see how this one sits against your taste."}
          </p>
        </div>
        {recommendation ? (
          <MatchRing value={recommendation.match} size={78} stroke={4} />
        ) : (
          <div className="grid size-[78px] place-items-center rounded-full border border-dashed border-ink/15 text-[0.55rem] uppercase tracking-[0.12em] text-ink/30">
            {loading ? <Loader2 className="size-4 animate-spin" /> : ready ? "—" : "?"}
          </div>
        )}
      </div>

      {!ready && (
        <Link
          href="/onboarding"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-[0.76rem] font-semibold text-ivory transition hover:bg-ink-soft"
        >
          <Sparkles className="size-3.5 text-amber-light" />
          Build my profile
          <ArrowRight className="size-3.5" />
        </Link>
      )}

      {ready && loading && !recommendation && (
        <div className="mt-5 space-y-2">
          <div className="skeleton h-3 w-4/5 rounded-full" />
          <div className="skeleton h-3 w-2/3 rounded-full" />
          <div className="skeleton h-3 w-1/2 rounded-full" />
        </div>
      )}

      {failed && !loading && (
        <div className="mt-5 rounded-2xl border border-rose/20 bg-rose/8 p-4">
          <p className="flex items-center gap-2 text-[0.72rem] leading-relaxed text-rose-deep">
            <AlertCircle className="size-3.5 shrink-0" />
            The scoring service is waking up or unreachable.
          </p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="mt-3 rounded-full border border-rose/30 px-4 py-2 text-[0.68rem] font-medium text-rose-deep"
          >
            Retry
          </button>
        </div>
      )}

      {recommendation && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[0.62rem] uppercase tracking-[0.14em] text-amber-dark">
              {recommendation.matchLabel}
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => update(recordFeedback(profile, perfumeId, "like"))}
                aria-pressed={feedback === "like"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.62rem] font-medium transition",
                  feedback === "like"
                    ? "border-amber bg-amber text-ink"
                    : "border-ink/12 text-ink/50 hover:border-amber hover:text-amber-dark",
                )}
              >
                <Heart className="size-3" /> More like this
              </button>
              <button
                type="button"
                onClick={() => update(recordFeedback(profile, perfumeId, "dislike"))}
                aria-pressed={feedback === "dislike"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.62rem] font-medium transition",
                  feedback === "dislike"
                    ? "border-rose bg-rose text-white"
                    : "border-ink/12 text-ink/50 hover:border-rose hover:text-rose-deep",
                )}
              >
                <X className="size-3" /> Not for me
              </button>
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {recommendation.reasons.map((reason) => (
              <li key={reason} className="flex gap-2.5 text-[0.74rem] leading-relaxed text-ink/65">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-amber" />
                {reason}
              </li>
            ))}
            {recommendation.conflicts.map((conflict) => (
              <li key={conflict} className="flex gap-2.5 text-[0.72rem] leading-relaxed text-rose-deep">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                {conflict}
              </li>
            ))}
          </ul>

          <div className="mt-5 grid gap-2.5 border-t border-ink/8 pt-4">
            {BARS.map((bar) => (
              <div key={bar.key}>
                <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-[0.08em] text-ink/38">
                  <span>{bar.label}</span>
                  <span>{percentage(recommendation.breakdown[bar.key])}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink/8">
                  <div
                    className="h-full rounded-full bg-amber transition-[width] duration-700"
                    style={{ width: `${percentage(recommendation.breakdown[bar.key])}` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[0.58rem] leading-relaxed text-ink/30">
            Match for {name} combines content similarity, a decision-tree estimate, cluster
            affinity and catalogue quality. Your feedback changes the next set.
          </p>
        </div>
      )}
    </div>
  );
}
