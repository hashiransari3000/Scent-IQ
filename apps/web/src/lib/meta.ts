import metaJson from "@/data/meta.json";
import type { ScentCluster, ScentFamily } from "./types";

export interface PriceTier {
  tier: number;
  label: string;
  note: string;
}

export interface NoteCount {
  name: string;
  count: number;
}

export interface CatalogueMeta {
  generatedAt: string;
  source: string;
  attribution: string;
  stats: {
    perfumes: number;
    houses: number;
    notes: number;
    families: number;
    clusters: number;
  };
  families: ScentFamily[];
  clusters: ScentCluster[];
  priceTiers: PriceTier[];
  notes: NoteCount[];
}

/**
 * Lightweight catalogue metadata (families, clusters, note frequencies).
 * Safe to import from client components: it never pulls in the full
 * 1,478-perfume catalogue, which stays server-side.
 */
export const META = metaJson as unknown as CatalogueMeta;

export const FAMILY_SLUGS = META.families.map((family) => family.slug);

export const NOTE_NAMES = META.notes.map((note) => note.name);

export function familyBySlug(slug: string): ScentFamily | undefined {
  return META.families.find((family) => family.slug === slug);
}

export function clusterById(id: number): ScentCluster | undefined {
  return META.clusters.find((cluster) => cluster.id === id);
}
