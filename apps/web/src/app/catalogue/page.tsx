import type { Metadata } from "next";
import { Suspense } from "react";
import { getCatalogue, searchCatalogue } from "@/lib/catalogue";
import type { Season, TimeOfDay } from "@/lib/types";
import { CatalogueExplorer, type CatalogueFilters } from "./catalogue-explorer";

export const metadata: Metadata = {
  title: "Catalogue",
  description:
    "Browse 1,478 perfumes from 160 houses. Filter by scent family, season, time of day, budget and the clusters learned by K-Means.",
};

type RawSearchParams = Record<string, string | string[] | undefined>;

const SEASONS = new Set<Season>(["spring", "summer", "autumn", "winter"]);
const TIMES = new Set<TimeOfDay>(["day", "evening", "night"]);
const SORTS = new Set<CatalogueFilters["sort"]>(["popularity", "name", "year", "recent"]);

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function many(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : value.split(",")).filter(Boolean);
}

function parseFilters(params: RawSearchParams): CatalogueFilters {
  const catalogue = getCatalogue();
  const familySlugs = new Set(catalogue.families.map((family) => family.slug));
  const familyNames = new Map(catalogue.families.map((family) => [family.name.toLowerCase(), family.slug]));

  const families = many(params.family)
    .map((value) => familySlugs.has(value) ? value : familyNames.get(value.toLowerCase()))
    .filter((value): value is string => Boolean(value));

  const seasons = many(params.season).filter((value): value is Season =>
    SEASONS.has(value as Season),
  );
  const times = many(params.time).filter((value): value is TimeOfDay =>
    TIMES.has(value as TimeOfDay),
  );

  const rawBudget = Number(single(params.budget));
  const budget = Number.isFinite(rawBudget) && rawBudget >= 1 && rawBudget <= 4 ? rawBudget : null;

  const rawCluster = Number(single(params.cluster));
  const cluster =
    Number.isFinite(rawCluster) && catalogue.clusters.some((entry) => entry.id === rawCluster)
      ? rawCluster
      : null;

  const sortValue = single(params.sort);
  const sort = SORTS.has(sortValue as CatalogueFilters["sort"])
    ? (sortValue as CatalogueFilters["sort"])
    : "popularity";

  const genderValue = single(params.gender);
  const gender = genderValue === "men" || genderValue === "women" ? genderValue : "any";

  return {
    q: (single(params.q) ?? "").slice(0, 80),
    family: [...new Set(families)],
    season: [...new Set(seasons)],
    time: [...new Set(times)],
    budget,
    gender,
    cluster,
    sort,
  };
}

async function CatalogueContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const filters = parseFilters(await searchParams);
  const initial = searchCatalogue({ ...filters, limit: 24, offset: 0 });
  return (
    <CatalogueExplorer
      initialItems={initial.items}
      initialTotal={initial.total}
      initialFilters={filters}
    />
  );
}

function CatalogueFallback() {
  return (
    <div className="pb-24">
      <section className="border-b border-ink/10 bg-ivory-soft">
        <div className="container-page py-12 md:py-16">
          <div className="skeleton h-3 w-24 rounded-full" />
          <div className="skeleton mt-5 h-14 w-2/3 rounded-2xl" />
          <div className="skeleton mt-4 h-4 w-1/2 rounded-full" />
          <div className="skeleton mt-9 h-12 w-full rounded-2xl" />
        </div>
      </section>
      <section className="container-page mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-[1.6rem] border border-ink/8">
            <div className="skeleton aspect-[4/5]" />
            <div className="space-y-2 p-4">
              <div className="skeleton h-3 w-3/4 rounded-full" />
              <div className="skeleton h-3 w-1/2 rounded-full" />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export default function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  return (
    <Suspense fallback={<CatalogueFallback />}>
      <CatalogueContent searchParams={searchParams} />
    </Suspense>
  );
}
