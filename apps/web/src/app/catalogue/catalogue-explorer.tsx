"use client";

import { ChevronDown, Filter, Loader2, Search, SearchX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChoiceChip } from "@/components/choice-chip";
import { PerfumeCard } from "@/components/perfume-card";
import { fetchCatalogue } from "@/lib/api";
import { META } from "@/lib/meta";
import type { Perfume, Season, TimeOfDay } from "@/lib/types";
import { cn, priceTierLabel } from "@/lib/utils";

export interface CatalogueFilters {
  q: string;
  family: string[];
  season: Season[];
  time: TimeOfDay[];
  budget: number | null;
  gender: string;
  cluster: number | null;
  sort: "popularity" | "name" | "year" | "recent";
}

const SORTS: { value: CatalogueFilters["sort"]; label: string }[] = [
  { value: "popularity", label: "Most popular" },
  { value: "name", label: "Name A–Z" },
  { value: "recent", label: "Newest first" },
];

const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];
const TIMES: { value: TimeOfDay; label: string }[] = [
  { value: "day", label: "Daytime" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
];

export function CatalogueExplorer({
  initialItems,
  initialTotal,
  initialFilters,
}: {
  initialItems: Perfume[];
  initialTotal: number;
  initialFilters: CatalogueFilters;
}) {
  const [filters, setFilters] = useState<CatalogueFilters>(initialFilters);
  const [query, setQuery] = useState(initialFilters.q);
  const [items, setItems] = useState<Perfume[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const mounted = useRef(false);
  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => (current.q === query ? current : { ...current, q: query }));
    }, 260);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      fetchCatalogue({
        q: filters.q || undefined,
        family: filters.family,
        season: filters.season,
        time: filters.time,
        budget: filters.budget,
        gender: filters.gender,
        cluster: filters.cluster,
        sort: filters.sort,
        limit: 24,
        offset: 0,
      })
        .then((response) => {
          if (id !== requestId.current) return;
          setItems(response.items);
          setTotal(response.total);
        })
        .catch(() => {
          if (id !== requestId.current) return;
          setError("The catalogue could not load. Please retry.");
        })
        .finally(() => {
          if (id === requestId.current) setLoading(false);
        });
    }, 180);

    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    filters.family.forEach((value) => params.append("family", value));
    filters.season.forEach((value) => params.append("season", value));
    filters.time.forEach((value) => params.append("time", value));
    if (filters.budget) params.set("budget", String(filters.budget));
    if (filters.gender !== "any") params.set("gender", filters.gender);
    if (filters.cluster !== null) params.set("cluster", String(filters.cluster));
    if (filters.sort !== "popularity") params.set("sort", filters.sort);
    const search = params.toString();
    window.history.replaceState(null, "", search ? `/catalogue?${search}` : "/catalogue");

    return () => clearTimeout(timer);
  }, [filters]);

  const activeCount = useMemo(
    () =>
      filters.family.length +
      filters.season.length +
      filters.time.length +
      (filters.budget ? 1 : 0) +
      (filters.gender !== "any" ? 1 : 0) +
      (filters.cluster !== null ? 1 : 0),
    [filters],
  );

  const cluster = filters.cluster !== null ? META.clusters.find((c) => c.id === filters.cluster) : null;

  const set = <K extends keyof CatalogueFilters>(key: K, value: CatalogueFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const toggleIn = <K extends "family" | "season" | "time">(
    key: K,
    value: CatalogueFilters[K][number],
  ) =>
    setFilters((current) => {
      const list = current[key] as string[];
      const next = list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];
      return { ...current, [key]: next } as CatalogueFilters;
    });

  const reset = () => {
    setQuery("");
    setFilters({
      q: "",
      family: [],
      season: [],
      time: [],
      budget: null,
      gender: "any",
      cluster: null,
      sort: "popularity",
    });
  };

  const loadMore = () => {
    const id = requestId.current;
    setLoadingMore(true);
    fetchCatalogue({
      q: filters.q || undefined,
      family: filters.family,
      season: filters.season,
      time: filters.time,
      budget: filters.budget,
      gender: filters.gender,
      cluster: filters.cluster,
      sort: filters.sort,
      limit: 24,
      offset: items.length,
    })
      .then((response) => {
        if (id !== requestId.current) return;
        setItems((current) => [...current, ...response.items]);
        setTotal(response.total);
      })
      .catch(() => setError("Could not load more perfumes."))
      .finally(() => setLoadingMore(false));
  };

  return (
    <div className="pb-24">
      <section className="border-b border-ink/10 bg-ivory-soft">
        <div className="container-page py-12 md:py-16">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow text-amber-dark">The catalogue</p>
              <h1 className="mt-3 font-display text-[clamp(2.6rem,5.5vw,4.6rem)] leading-[0.97]">
                {META.stats.perfumes.toLocaleString()} compositions,
                <br />
                <span className="italic text-ink/50">one scent space.</span>
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink/55">
                Notes, families, seasons and learned clusters. Search by perfume, house or note — or
                narrow by the way you actually wear scent.
              </p>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <p className="font-display text-[1.8rem] leading-none">{META.stats.houses}</p>
                <p className="mt-1 text-[0.55rem] uppercase tracking-[0.14em] text-ink/35">Houses</p>
              </div>
              <div>
                <p className="font-display text-[1.8rem] leading-none">{META.stats.notes}</p>
                <p className="mt-1 text-[0.55rem] uppercase tracking-[0.14em] text-ink/35">Notes</p>
              </div>
              <div>
                <p className="font-display text-[1.8rem] leading-none">{META.stats.clusters}</p>
                <p className="mt-1 text-[0.55rem] uppercase tracking-[0.14em] text-ink/35">Clusters</p>
              </div>
            </div>
          </div>

          <div className="mt-9 flex flex-col gap-3 md:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-ink/12 bg-ivory px-4">
              <Search className="size-4 text-ink/35" strokeWidth={1.7} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search perfume, house or note…"
                aria-label="Search the catalogue"
                className="h-12 w-full bg-transparent text-[0.85rem] outline-none placeholder:text-ink/30"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="text-ink/35 hover:text-ink"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowFilters((value) => !value)}
                aria-expanded={showFilters}
                className={cn(
                  "inline-flex h-12 items-center gap-2 rounded-2xl border px-4 text-[0.78rem] font-medium transition",
                  showFilters || activeCount
                    ? "border-ink bg-ink text-ivory"
                    : "border-ink/12 bg-ivory text-ink/65 hover:border-ink/30",
                )}
              >
                <Filter className="size-4" />
                Filters
                {activeCount > 0 && (
                  <span className="grid size-5 place-items-center rounded-full bg-amber text-[0.6rem] font-semibold text-ink">
                    {activeCount}
                  </span>
                )}
              </button>

              <div className="relative">
                <select
                  value={filters.sort}
                  onChange={(event) => set("sort", event.target.value as CatalogueFilters["sort"])}
                  aria-label="Sort perfumes"
                  className="h-12 appearance-none rounded-2xl border border-ink/12 bg-ivory pl-4 pr-9 text-[0.78rem] text-ink/65 outline-none focus:border-amber"
                >
                  {SORTS.map((sort) => (
                    <option key={sort.value} value={sort.value}>
                      {sort.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink/35" />
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 space-y-5 rounded-[1.6rem] border border-ink/10 bg-ivory p-5">
              <div>
                <p className="text-[0.6rem] uppercase tracking-[0.16em] text-ink/35">Family</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {META.families.map((family) => (
                    <ChoiceChip
                      key={family.slug}
                      selected={filters.family.includes(family.slug)}
                      onClick={() => toggleIn("family", family.slug)}
                    >
                      {family.name}
                    </ChoiceChip>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <p className="text-[0.6rem] uppercase tracking-[0.16em] text-ink/35">Season</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {SEASONS.map((season) => (
                      <ChoiceChip
                        key={season}
                        selected={filters.season.includes(season)}
                        onClick={() => toggleIn("season", season)}
                      >
                        {season.charAt(0).toUpperCase() + season.slice(1)}
                      </ChoiceChip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[0.6rem] uppercase tracking-[0.16em] text-ink/35">Time</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {TIMES.map((time) => (
                      <ChoiceChip
                        key={time.value}
                        selected={filters.time.includes(time.value)}
                        onClick={() => toggleIn("time", time.value)}
                      >
                        {time.label}
                      </ChoiceChip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[0.6rem] uppercase tracking-[0.16em] text-ink/35">Budget</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <ChoiceChip
                      selected={filters.budget === null}
                      onClick={() => set("budget", null)}
                    >
                      Any
                    </ChoiceChip>
                    {META.priceTiers.map((tier) => (
                      <ChoiceChip
                        key={tier.tier}
                        selected={filters.budget === tier.tier}
                        onClick={() => set("budget", tier.tier)}
                      >
                        {priceTierLabel(tier.tier)}
                      </ChoiceChip>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/8 pt-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[0.6rem] uppercase tracking-[0.16em] text-ink/35">Shop</span>
                  {[
                    { value: "any", label: "No preference" },
                    { value: "women", label: "Women's" },
                    { value: "men", label: "Men's" },
                  ].map((option) => (
                    <ChoiceChip
                      key={option.value}
                      selected={filters.gender === option.value}
                      onClick={() => set("gender", option.value)}
                    >
                      {option.label}
                    </ChoiceChip>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="text-[0.66rem] uppercase tracking-[0.12em] text-ink/40 transition hover:text-rose-deep"
                >
                  Reset everything
                </button>
              </div>
            </div>
          )}

          {(cluster || activeCount > 0) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {cluster && (
                <span className="inline-flex items-center gap-2 rounded-full border border-amber/40 bg-amber/10 px-3 py-1.5 text-[0.68rem] text-amber-dark">
                  <span className="size-2 rounded-full" style={{ background: cluster.color }} />
                  {cluster.name}
                  <button
                    type="button"
                    onClick={() => set("cluster", null)}
                    aria-label="Clear cluster filter"
                    className="text-amber-dark/60 hover:text-amber-dark"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}
              {filters.family.map((slug) => (
                <span
                  key={slug}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink/12 bg-ivory px-3 py-1.5 text-[0.68rem] text-ink/60"
                >
                  {META.families.find((family) => family.slug === slug)?.name ?? slug}
                  <button
                    type="button"
                    onClick={() => toggleIn("family", slug)}
                    aria-label={`Remove ${slug} filter`}
                    className="text-ink/35 hover:text-ink"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              {filters.season.map((season) => (
                <span
                  key={season}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink/12 bg-ivory px-3 py-1.5 text-[0.68rem] text-ink/60"
                >
                  {season.charAt(0).toUpperCase() + season.slice(1)}
                  <button
                    type="button"
                    onClick={() => toggleIn("season", season)}
                    aria-label={`Remove ${season} filter`}
                    className="text-ink/35 hover:text-ink"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              {filters.time.map((time) => (
                <span
                  key={time}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink/12 bg-ivory px-3 py-1.5 text-[0.68rem] text-ink/60"
                >
                  {TIMES.find((item) => item.value === time)?.label ?? time}
                  <button
                    type="button"
                    onClick={() => toggleIn("time", time)}
                    aria-label={`Remove ${time} filter`}
                    className="text-ink/35 hover:text-ink"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              {filters.budget && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/12 bg-ivory px-3 py-1.5 text-[0.68rem] text-ink/60">
                  {priceTierLabel(filters.budget)} or less
                  <button
                    type="button"
                    onClick={() => set("budget", null)}
                    aria-label="Remove budget filter"
                    className="text-ink/35 hover:text-ink"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="container-page pt-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[0.66rem] uppercase tracking-[0.14em] text-ink/40">
            {loading ? "Searching…" : `${total.toLocaleString()} perfumes`}
          </p>
          {loading && <Loader2 className="size-4 animate-spin text-amber" />}
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose/25 bg-rose/8 px-5 py-4 text-[0.8rem] text-rose-deep">
            {error}
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
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
        ) : items.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-[1.8rem] border border-ink/10 bg-ivory-soft px-6 py-16 text-center">
            <SearchX className="size-8 text-ink/25" strokeWidth={1.4} />
            <p className="mt-4 font-display text-[1.8rem]">Nothing matches that combination.</p>
            <p className="mt-2 max-w-sm text-[0.82rem] leading-relaxed text-ink/45">
              Try a broader search term, or clear a filter. The catalogue is deep but not infinite.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-5 rounded-full bg-ink px-5 py-2.5 text-[0.76rem] font-medium text-ivory"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <>
            <div
              className={cn(
                "mt-6 grid grid-cols-2 gap-4 transition-opacity md:grid-cols-3 xl:grid-cols-4",
                loading && "opacity-50",
              )}
            >
              {items.map((perfume) => (
                <PerfumeCard key={perfume.id} perfume={perfume} />
              ))}
            </div>

            {items.length < total && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-6 py-3.5 text-[0.78rem] font-medium text-ink/70 transition hover:border-ink/45 hover:text-ink disabled:opacity-50"
                >
                  {loadingMore && <Loader2 className="size-3.5 animate-spin" />}
                  Show more · {(total - items.length).toLocaleString()} remaining
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
