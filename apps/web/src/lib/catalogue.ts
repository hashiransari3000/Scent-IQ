import catalogueJson from "@/data/catalogue.json";
import type {
  Catalogue,
  CatalogueQuery,
  CatalogueResponse,
  Perfume,
  ScentCluster,
  ScentFamily,
  Season,
  TimeOfDay,
} from "./types";

const catalogue = catalogueJson as unknown as Catalogue;
const byId = new Map(catalogue.perfumes.map((perfume) => [perfume.id, perfume]));
const familyBySlug = new Map(catalogue.families.map((family) => [family.slug, family]));
const familyByName = new Map(catalogue.families.map((family) => [family.name, family]));
const clusterById = new Map(catalogue.clusters.map((cluster) => [cluster.id, cluster]));

export function getCatalogue(): Catalogue {
  return catalogue;
}

export function getPerfume(id: string): Perfume | undefined {
  return byId.get(id);
}

export function getFamily(value: string): ScentFamily | undefined {
  return familyBySlug.get(value) ?? familyByName.get(value);
}

export function getCluster(id: number): ScentCluster | undefined {
  return clusterById.get(id);
}

export function getFeatured(limit = 8): Perfume[] {
  return [...catalogue.perfumes]
    .sort((a, b) => {
      const rankA = a.popularityRank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.popularityRank ?? Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}

export function getSimilar(perfume: Perfume, limit = 8): Perfume[] {
  const items: Perfume[] = [];
  for (const id of perfume.similarIds ?? []) {
    const item = byId.get(id);
    if (item) items.push(item);
    if (items.length >= limit) break;
  }
  return items;
}

export function getPerfumesByCluster(clusterId: number, limit = 12): Perfume[] {
  return catalogue.perfumes
    .filter((perfume) => perfume.clusterId === clusterId)
    .sort((a, b) => (a.popularityRank ?? 99999) - (b.popularityRank ?? 99999))
    .slice(0, limit);
}

export function getNotes(limit = 120): { note: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const perfume of catalogue.perfumes) {
    for (const note of perfume.notes) {
      counts.set(note, (counts.get(note) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([note, count]) => ({ note, count }));
}

export function getStats() {
  const houses = new Set(catalogue.perfumes.map((perfume) => perfume.house));
  const notes = new Set(catalogue.perfumes.flatMap((perfume) => perfume.notes));
  return {
    perfumes: catalogue.perfumes.length,
    houses: houses.size,
    notes: notes.size,
    families: catalogue.families.length,
    clusters: catalogue.clusters.length,
  };
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchesFamily(perfume: Perfume, values: string[]): boolean {
  if (!values.length) return true;
  const set = new Set(values);
  return (
    set.has(perfume.family) ||
    (perfume.secondaryFamily ? set.has(perfume.secondaryFamily) : false)
  );
}

export function searchCatalogue(query: CatalogueQuery = {}): CatalogueResponse {
  const familyValues = query.family?.flatMap((value) => {
    const family = getFamily(value);
    return family ? [family.name, family.slug] : [value];
  }) ?? [];

  const idOrder = query.ids?.length ? query.ids : null;
  const base = idOrder
    ? idOrder.map((id) => byId.get(id)).filter((item): item is Perfume => Boolean(item))
    : [...catalogue.perfumes];

  const items = base.filter((perfume) => {
    if (query.q) {
      const needle = normalize(query.q);
      const haystack = normalize(
        `${perfume.name} ${perfume.house} ${perfume.family} ${perfume.description} ${perfume.notes.join(" ")}`,
      );
      if (!haystack.includes(needle)) return false;
    }
    if (!matchesFamily(perfume, familyValues)) return false;
    if (
      query.season?.length &&
      !query.season.some((season) => perfume.seasons.includes(season as Season))
    ) {
      return false;
    }
    if (query.time?.length && !query.time.some((time) => perfume.times.includes(time as TimeOfDay))) {
      return false;
    }
    if (query.budget && perfume.priceTier > query.budget) return false;
    if (query.gender && query.gender !== "any") {
      if (perfume.gender !== "unisex" && perfume.gender !== query.gender) return false;
    }
    if (query.cluster !== null && query.cluster !== undefined && perfume.clusterId !== query.cluster) {
      return false;
    }
    return true;
  });

  if (!idOrder) {
    switch (query.sort) {
      case "name":
        items.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "year":
        items.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
        break;
      case "recent":
        items.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.name.localeCompare(b.name));
        break;
      default:
        items.sort((a, b) => {
          const rankA = a.popularityRank ?? Number.MAX_SAFE_INTEGER;
          const rankB = b.popularityRank ?? Number.MAX_SAFE_INTEGER;
          if (rankA !== rankB) return rankA - rankB;
          return a.name.localeCompare(b.name);
        });
    }
  }

  const offset = Math.max(0, query.offset ?? 0);
  const limit = Math.max(1, Math.min(100, query.limit ?? 24));
  return {
    items: items.slice(offset, offset + limit),
    total: items.length,
    offset,
    limit,
  };
}
