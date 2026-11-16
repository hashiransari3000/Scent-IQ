import type {
  CatalogueQuery,
  CatalogueResponse,
  Recommendation,
  UserProfile,
} from "./types";
import { toRecommendRequest } from "./profile";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 18000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new ApiError(detail || `Request failed (${response.status})`, response.status);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("The recommendation service took too long to respond.");
    }
    throw new ApiError("The recommendation service is unavailable.");
  } finally {
    clearTimeout(timer);
  }
}

interface RecommendResponse {
  items: Recommendation[];
  meta: {
    considered: number;
    returned: number;
    relaxedFilters: boolean;
    model: string;
    weights: Record<string, number>;
  };
}

export async function fetchRecommendations(
  profile: UserProfile,
  limit = 12,
  filters: Record<string, unknown> = {},
): Promise<RecommendResponse> {
  return request<RecommendResponse>("/v1/recommend", {
    method: "POST",
    body: JSON.stringify(toRecommendRequest(profile, limit, filters)),
  });
}

export async function fetchExplanation(
  perfumeId: string,
  profile: UserProfile,
): Promise<Recommendation> {
  return request<Recommendation>(`/v1/explain/${encodeURIComponent(perfumeId)}`, {
    method: "POST",
    body: JSON.stringify(toRecommendRequest(profile, 1)),
  });
}

export async function fetchModelInfo<T = Record<string, unknown>>(): Promise<T> {
  return request<T>("/v1/model/info");
}

export async function fetchCatalogue(query: CatalogueQuery = {}): Promise<CatalogueResponse> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  query.ids?.forEach((value) => params.append("id", value));
  query.family?.forEach((value) => params.append("family", value));
  query.season?.forEach((value) => params.append("season", value));
  query.time?.forEach((value) => params.append("time", value));
  if (query.budget) params.set("budget", String(query.budget));
  if (query.gender) params.set("gender", query.gender);
  if (query.cluster !== null && query.cluster !== undefined) {
    params.set("cluster", String(query.cluster));
  }
  params.set("sort", query.sort ?? "popularity");
  params.set("limit", String(query.limit ?? 24));
  params.set("offset", String(query.offset ?? 0));

  const response = await fetch(`/api/catalogue?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new ApiError("Could not load the catalogue.");
  return (await response.json()) as CatalogueResponse;
}
