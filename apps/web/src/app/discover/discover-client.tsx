"use client";

import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  Heart,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChoiceChip } from "@/components/choice-chip";
import { PerfumeCard } from "@/components/perfume-card";
import { ScentMap } from "@/components/scent-map";
import { fetchCatalogue, fetchRecommendations } from "@/lib/api";
import { META } from "@/lib/meta";
import { hasProfile, recordFeedback, useProfile } from "@/lib/profile";
import { rankOnDevice } from "@/lib/local-rank";
import type { MatchBreakdown, Perfume, Recommendation, Season, TimeOfDay } from "@/lib/types";
import { cn, percentage, priceTierLabel } from "@/lib/utils";

interface RecommendMeta {
  considered: number;
  returned: number;
  relaxedFilters: boolean;
  model: string;
  weights: Record<string, number>;
}

const BAR_ROWS: { key: keyof MatchBreakdown; label: string }[] = [
  { key: "content", label: "Content similarity" },
  { key: "tree", label: "Predicted enjoyment" },
  { key: "cluster", label: "Cluster affinity" },
  { key: "quality", label: "Catalogue quality" },
];

const SEASON_OPTIONS: Season[] = ["spring", "summer", "autumn", "winter"];
const TIME_OPTIONS: { value: TimeOfDay; label: string }[] = [
  { value: "day", label: "Daytime" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
];

export function DiscoverClient({ featured }: { featured: Perfume[] }) {
  const { profile, update } = useProfile();
  const ready = hasProfile(profile);

  const [items, setItems] = useState<Recommendation[]>([]);
  const [meta, setMeta] = useState<RecommendMeta | null>(null);
  const [mode, setMode] = useState<"api" | "local" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [times, setTimes] = useState<TimeOfDay[]>([]);
  const [budget, setBudget] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const filters = {
      seasons,
      times,
      budget_max: budget ?? undefined,
    };

    fetchRecommendations(profile, 24, filters)
      .then((response) => {
        if (cancelled) return;
        setItems(response.items);
        setMeta(response.meta);
        setMode("api");
      })
      .catch(async () => {
        if (cancelled) return;
        try {
          const pool = await fetchCatalogue({
            season: seasons,
            time: times,
            budget,
            limit: 120,
          });
          if (cancelled) return;
          setItems(rankOnDevice(pool.items, profile, 24));
          setMeta(null);
          setMode("local");
        } catch {
          if (cancelled) return;
          setError("We could not reach the recommendation service. Check your connection and retry.");
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profile, ready, seasons, times, budget, version]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const filtersActive = seasons.length > 0 || times.length > 0 || budget !== null;

  const clearFilters = () => {
    setSeasons([]);
    setTimes([]);
    setBudget(null);
  };

  const onFeedback = (id: string, verdict: "like" | "dislike") => {
    update(recordFeedback(profile, id, verdict));
    setToast(
      verdict === "like"
        ? "Noted — we will look for more like this."
        : "Understood — this one is out of your next set.",
    );
  };

  const familyNames = profile.families
    .map((slug) => META.families.find((family) => family.slug === slug)?.name ?? slug)
    .slice(0, 5);

  return (
    <div className="pb-24">
      <section className="relative overflow-hidden bg-ink text-ivory">
        <div className="pointer-events-none absolute -left-24 top-0 size-[28rem] rounded-full bg-amber/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 size-[24rem] rounded-full bg-rose/10 blur-3xl" />
        <div className="container-page relative py-10 md:py-20">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow text-amber-light/85">For you</p>
              <h1 className="mt-4 font-display text-[clamp(2.7rem,6vw,5rem)] leading-[0.95]">
                Your scent,
                <br />
                <span className="italic text-ivory/55">in order.</span>
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-relaxed text-ivory/55 md:text-[0.95rem]">
                {ready
                  ? "Every perfume is scored against your profile, then diversified so the list does not collapse into one family. Adjust the filters and the shortlist follows."
                  : "ScentIQ compares notes, families and structure — not brand hype. Build a profile and the catalogue reorders around your taste."}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 rounded-full bg-amber px-5 py-3 text-[0.8rem] font-semibold text-ink transition hover:bg-amber-light"
                >
                  <Sparkles className="size-4" />
                  {ready ? "Tune my profile" : "Build my scent profile"}
                </Link>
                <Link
                  href="/catalogue"
                  className="inline-flex items-center gap-2 rounded-full border border-ivory/20 px-5 py-3 text-[0.8rem] font-medium text-ivory/75 transition hover:border-ivory/45 hover:text-ivory"
                >
                  Browse all 1,478
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>

            <div className="hidden w-full max-w-sm rounded-[1.6rem] border border-ivory/12 bg-ivory/[0.035] p-5 backdrop-blur-sm lg:block">
              <p className="text-[0.55rem] uppercase tracking-[0.2em] text-ivory/35">
                Profile signal
              </p>
              {ready ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-[0.58rem] uppercase tracking-[0.14em] text-ivory/30">
                      Families
                    </p>
                    <p className="mt-1.5 text-[0.8rem] leading-relaxed text-ivory/70">
                      {familyNames.length ? familyNames.join(" · ") : "Inferred from your wardrobe"}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 border-t border-ivory/8 pt-4">
                    <div>
                      <p className="font-display text-[1.6rem] leading-none">
                        {profile.lovedIds.length}
                      </p>
                      <p className="mt-1 text-[0.52rem] uppercase tracking-[0.12em] text-ivory/35">
                        Wardrobe
                      </p>
                    </div>
                    <div>
                      <p className="font-display text-[1.6rem] leading-none">
                        {profile.loveNotes.length}
                      </p>
                      <p className="mt-1 text-[0.52rem] uppercase tracking-[0.12em] text-ivory/35">
                        Loved notes
                      </p>
                    </div>
                    <div>
                      <p className="font-display text-[1.6rem] leading-none">
                        {profile.seasons.length}
                      </p>
                      <p className="mt-1 text-[0.52rem] uppercase tracking-[0.12em] text-ivory/35">
                        Seasons
                      </p>
                    </div>
                  </div>
                  <p className="text-[0.6rem] leading-relaxed text-ivory/30">
                    Stored locally in this browser. Feedback updates the list immediately.
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-[0.78rem] leading-relaxed text-ivory/45">
                  No profile yet. Ninety seconds of choices is enough to start scoring —
                  you can refine it at any time.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {!ready ? (
        <Gate featured={featured} />
      ) : (
        <>
          <section className="border-b border-ink/10 bg-ivory-soft">
            <div className="container-page py-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 inline-flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.16em] text-ink/35">
                    <SlidersHorizontal className="size-3.5" /> Refine
                  </span>
                  {SEASON_OPTIONS.map((season) => (
                    <ChoiceChip
                      key={season}
                      selected={seasons.includes(season)}
                      onClick={() =>
                        setSeasons((current) =>
                          current.includes(season)
                            ? current.filter((value) => value !== season)
                            : [...current, season],
                        )
                      }
                    >
                      {season.charAt(0).toUpperCase() + season.slice(1)}
                    </ChoiceChip>
                  ))}
                  <span className="mx-1 hidden h-4 w-px bg-ink/10 sm:block" />
                  {TIME_OPTIONS.map((time) => (
                    <ChoiceChip
                      key={time.value}
                      selected={times.includes(time.value)}
                      onClick={() =>
                        setTimes((current) =>
                          current.includes(time.value)
                            ? current.filter((value) => value !== time.value)
                            : [...current, time.value],
                        )
                      }
                    >
                      {time.label}
                    </ChoiceChip>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="budget" className="text-[0.6rem] uppercase tracking-[0.16em] text-ink/35">
                    Budget
                  </label>
                  <select
                    id="budget"
                    value={budget ?? ""}
                    onChange={(event) =>
                      setBudget(event.target.value ? Number(event.target.value) : null)
                    }
                    className="h-9 rounded-full border border-ink/12 bg-ivory-soft px-3 text-[0.74rem] text-ink/70 outline-none focus:border-amber"
                  >
                    <option value="">Any</option>
                    {META.priceTiers.map((tier) => (
                      <option key={tier.tier} value={tier.tier}>
                        {priceTierLabel(tier.tier)}
                      </option>
                    ))}
                  </select>
                  {filtersActive && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-[0.62rem] uppercase tracking-[0.12em] text-ink/40 transition hover:text-rose-deep"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setVersion((value) => value + 1)}
                    aria-label="Refresh recommendations"
                    className="grid size-9 place-items-center rounded-full border border-ink/12 text-ink/55 transition hover:border-ink/30 hover:text-ink"
                  >
                    <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="container-page pt-10 md:pt-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-amber-dark">
                  {meta ? `${meta.returned} of ${meta.considered} considered` : "Your shortlist"}
                </p>
                <h2 className="mt-2 font-display text-[clamp(2rem,4vw,3rem)] leading-none">
                  The shortlist
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.12em]",
                    mode === "api"
                      ? "border-moss/30 bg-moss/10 text-moss"
                      : "border-amber/40 bg-amber/10 text-amber-dark",
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", mode === "api" ? "bg-moss" : "bg-amber")} />
                  {mode === "api" ? "Live hybrid model" : mode === "local" ? "On-device estimate" : "Scoring"}
                </span>
                {meta?.relaxedFilters && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose/30 bg-rose/10 px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.12em] text-rose-deep">
                    <AlertCircle className="size-3" /> Filters relaxed
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.62rem] uppercase tracking-[0.1em] text-ink/35">
              <span>Content 40%</span>
              <span>Tree 30%</span>
              <span>Cluster 20%</span>
              <span>Quality 10%</span>
              <span className="normal-case tracking-normal text-ink/30">
                · MMR diversity re-rank
              </span>
            </div>

            {loading && items.length > 0 && (
              <p className="mt-4 animate-pulse text-[0.68rem] uppercase tracking-[0.14em] text-amber-dark">
                Re-scoring your profile…
              </p>
            )}

            {error && (
              <div className="mt-8 flex flex-col items-start gap-3 rounded-[1.6rem] border border-rose/25 bg-rose/8 p-6">
                <p className="flex items-center gap-2 text-[0.85rem] font-medium text-rose-deep">
                  <AlertCircle className="size-4" /> {error}
                </p>
                <button
                  type="button"
                  onClick={() => setVersion((value) => value + 1)}
                  className="rounded-full bg-ink px-5 py-2.5 text-[0.76rem] font-medium text-ivory"
                >
                  Try again
                </button>
              </div>
            )}

            {!error && loading && items.length === 0 && (
              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="overflow-hidden rounded-[1.6rem] border border-ink/8">
                    <div className="skeleton aspect-[4/5]" />
                    <div className="space-y-2 p-4">
                      <div className="skeleton h-3 w-3/4 rounded-full" />
                      <div className="skeleton h-3 w-1/2 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && items.length === 0 && (
              <div className="mt-8 rounded-[1.8rem] border border-ink/10 bg-ivory-soft p-8">
                <p className="font-display text-[1.8rem]">No matches under these filters.</p>
                <p className="mt-2 max-w-md text-[0.82rem] leading-relaxed text-ink/50">
                  Your filters narrowed the catalogue to nothing. Clear one or two, or let the
                  model relax them for you — it will tell you when it does.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-full bg-ink px-5 py-2.5 text-[0.76rem] font-medium text-ivory"
                >
                  Clear filters
                </button>
              </div>
            )}

            {items.length > 0 && (
              <div
                className={cn(
                  "mt-8 grid grid-cols-2 gap-4 transition-opacity md:grid-cols-3 xl:grid-cols-4",
                  loading && "opacity-60",
                )}
              >
                {items.map((item) => (
                  <PerfumeCard
                    key={item.id}
                    perfume={item}
                    match={item.match}
                    reason={item.reasons[0]}
                    footer={
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[0.56rem] uppercase tracking-[0.14em] text-ink/40">
                            {item.matchLabel}
                          </span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => onFeedback(item.id, "like")}
                              aria-label={`More like ${item.name}`}
                              aria-pressed={profile.feedback[item.id] === "like"}
                              className={cn(
                                "grid size-8 place-items-center rounded-full border transition",
                                profile.feedback[item.id] === "like"
                                  ? "border-amber bg-amber text-ink"
                                  : "border-ink/12 text-ink/45 hover:border-amber hover:text-amber-dark",
                              )}
                            >
                              <Heart className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onFeedback(item.id, "dislike")}
                              aria-label={`Not for me: ${item.name}`}
                              aria-pressed={profile.feedback[item.id] === "dislike"}
                              className={cn(
                                "grid size-8 place-items-center rounded-full border transition",
                                profile.feedback[item.id] === "dislike"
                                  ? "border-rose bg-rose text-white"
                                  : "border-ink/12 text-ink/45 hover:border-rose hover:text-rose-deep",
                              )}
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        <details className="group">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-2 text-[0.6rem] uppercase tracking-[0.12em] text-ink/40 transition hover:text-ink">
                            Why this match
                            <ChevronDown className="size-3 transition group-open:rotate-180" />
                          </summary>
                          <div className="space-y-2 pb-2">
                            <ul className="space-y-1.5">
                              {item.reasons.map((reason) => (
                                <li
                                  key={reason}
                                  className="flex gap-2 text-[0.68rem] leading-relaxed text-ink/60"
                                >
                                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-amber" />
                                  {reason}
                                </li>
                              ))}
                            </ul>
                            {item.conflicts.map((conflict) => (
                              <p
                                key={conflict}
                                className="flex gap-2 text-[0.66rem] leading-relaxed text-rose-deep"
                              >
                                <AlertCircle className="mt-0.5 size-3 shrink-0" />
                                {conflict}
                              </p>
                            ))}
                            <div className="space-y-1.5 pt-1">
                              {BAR_ROWS.map((bar) => (
                                <div key={bar.key}>
                                  <div className="flex items-center justify-between text-[0.58rem] text-ink/40">
                                    <span>{bar.label}</span>
                                    <span>{percentage(item.breakdown[bar.key])}</span>
                                  </div>
                                  <div className="mt-0.5 h-0.5 overflow-hidden rounded-full bg-ink/8">
                                    <div
                                      className="h-full rounded-full bg-amber"
                                      style={{ width: `${percentage(item.breakdown[bar.key])}` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </details>
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </section>

          {items.length > 3 && (
            <section className="container-page mt-16">
              <div className="overflow-hidden rounded-[2rem] bg-ink px-5 pb-5 pt-7 text-ivory sm:px-8">
                <div className="flex flex-wrap items-end justify-between gap-4 pb-5">
                  <div>
                    <p className="eyebrow text-amber-light/80">Your scent map</p>
                    <h2 className="mt-2 font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-none">
                      Where these sit in the space
                    </h2>
                  </div>
                  <p className="max-w-xs text-[0.7rem] leading-relaxed text-ivory/40">
                    Positions come from a PCA projection of the note-family vectors. Nearby points
                    smell related; colour marks the learned cluster.
                  </p>
                </div>
                <ScentMap items={items} labelTop={4} />
              </div>
            </section>
          )}

          <section className="container-page mt-10">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-ink/10 bg-ivory-soft px-5 py-4">
              <p className="text-[0.74rem] leading-relaxed text-ink/50">
                Likes and dislikes update your wardrobe immediately — the next set is scored with
                them.
              </p>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-ink/60 transition hover:text-ink"
              >
                Open my profile <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </section>
        </>
      )}

      <div
        role="status"
        aria-live="polite"
        className={cn(
          "pointer-events-none fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-full bg-ink px-5 py-3 text-center text-[0.74rem] text-ivory shadow-xl transition-all duration-300 empty:hidden md:bottom-8",
          toast ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        )}
      >
        {toast}
      </div>
    </div>
  );
}

function Gate({ featured }: { featured: Perfume[] }) {
  return (
    <section className="container-page pt-12 md:pt-16">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-ink/10 bg-ivory-soft p-6 sm:p-9">
          <p className="eyebrow text-amber-dark">Before we rank</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.02]">
            A shortlist needs
            <br />
            <span className="italic text-ink/50">a point of view.</span>
          </h2>
          <p className="mt-4 max-w-md text-[0.84rem] leading-relaxed text-ink/55">
            Tell ScentIQ a few families, notes or perfumes you love. The model builds a note-family
            vector, compares it to all 1,478 compositions, and explains each match. Family
            selection alone is enough to begin.
          </p>
          <Link
            href="/onboarding"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[0.82rem] font-semibold text-ivory transition hover:bg-ink-soft"
          >
            <Sparkles className="size-4 text-amber-light" />
            Build my profile
          </Link>
          <div className="mt-8 grid grid-cols-3 gap-4 border-t border-ink/8 pt-5">
            {[
              { value: "90s", label: "to a first set" },
              { value: "14", label: "scent families" },
              { value: "0", label: "accounts needed" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-[1.6rem] leading-none">{stat.value}</p>
                <p className="mt-1 text-[0.55rem] uppercase tracking-[0.12em] text-ink/35">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] bg-ink p-6 text-ivory sm:p-8">
          <p className="text-[0.58rem] uppercase tracking-[0.18em] text-ivory/40">
            Meanwhile · popular entry points
          </p>
          <div className="mt-5 space-y-2.5">
            {featured.map((perfume) => (
              <Link
                key={perfume.id}
                href={`/perfume/${perfume.id}`}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-ivory/10 bg-ivory/[0.03] px-4 py-3 transition hover:border-ivory/25 hover:bg-ivory/[0.06]"
              >
                <div className="min-w-0">
                  <p className="truncate font-display text-[1.05rem] leading-tight">{perfume.name}</p>
                  <p className="truncate text-[0.62rem] text-ivory/40">
                    {perfume.house} · {perfume.family}
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-ivory/30 transition group-hover:text-amber-light" />
              </Link>
            ))}
          </div>
          <p className="mt-5 text-[0.6rem] leading-relaxed text-ivory/30">
            Opening a perfume does not require a profile. You can read its pyramid, cluster and
            nearest neighbours first.
          </p>
        </div>
      </div>
    </section>
  );
}
