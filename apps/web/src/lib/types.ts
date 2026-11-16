export type Season = "spring" | "summer" | "autumn" | "winter";
export type TimeOfDay = "day" | "evening" | "night";
export type Gender = "unisex" | "men" | "women";

export interface ScentFamily {
  name: string;
  slug: string;
  color: string;
  gradientStart: string;
  gradientEnd: string;
  imageKey: string;
  description: string;
  count?: number;
}

export interface ScentCluster {
  id: number;
  name: string;
  description: string;
  topNotes: string[];
  primaryFamily: string;
  secondaryFamily: string;
  color: string;
  size: number;
  meanWeights?: Record<string, number>;
}

export interface Perfume {
  id: string;
  name: string;
  house: string;
  year: number | null;
  concentration: string;
  family: string;
  secondaryFamily: string | null;
  familySlug?: string;
  familyColor?: string;
  character: string[];
  seasons: Season[];
  times: TimeOfDay[];
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  notes: string[];
  description: string;
  popularityRank?: number | null;
  priceTier: number;
  priceTierSource?: string;
  gender: Gender;
  imageKey: string;
  familyWeights?: Record<string, number>;
  clusterId: number;
  clusterName: string;
  clusterColor?: string;
  similarIds: string[];
  coordinates?: [number, number];
  url?: string;
}

export interface MatchBreakdown {
  content: number;
  tree: number;
  cluster: number;
  quality: number;
  noteOverlap: number;
  avoidConflict: number;
}

export interface Recommendation extends Perfume {
  match: number;
  matchLabel: string;
  reasons: string[];
  conflicts: string[];
  breakdown: MatchBreakdown;
}

export interface Catalogue {
  generatedAt: string;
  source: string;
  attribution: string;
  families: ScentFamily[];
  priceTiers: { tier: number; label: string; note: string }[];
  clusters: ScentCluster[];
  perfumes: Perfume[];
}

export interface UserProfile {
  lovedIds: string[];
  loveNotes: string[];
  avoidNotes: string[];
  families: string[];
  seasons: Season[];
  times: TimeOfDay[];
  budgetTier: number | null;
  gender: "any" | "men" | "women";
  excludeIds: string[];
  feedback: Record<string, "like" | "dislike">;
  updatedAt: string;
}

export interface CatalogueQuery {
  q?: string;
  ids?: string[];
  family?: string[];
  season?: string[];
  time?: string[];
  budget?: number | null;
  gender?: string;
  cluster?: number | null;
  sort?: "popularity" | "name" | "year" | "recent";
  limit?: number;
  offset?: number;
}

export interface CatalogueResponse {
  items: Perfume[];
  total: number;
  offset: number;
  limit: number;
}
