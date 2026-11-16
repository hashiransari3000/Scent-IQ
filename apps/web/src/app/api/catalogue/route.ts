import { NextResponse, type NextRequest } from "next/server";
import { searchCatalogue } from "@/lib/catalogue";

const SORTS = new Set(["popularity", "name", "year", "recent"]);

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const budgetParam = params.get("budget");
  const clusterParam = params.get("cluster");
  const sort = params.get("sort") ?? "popularity";
  if (!SORTS.has(sort)) {
    return NextResponse.json({ detail: "Invalid sort" }, { status: 400 });
  }

  const budget = budgetParam ? Number(budgetParam) : null;
  const cluster = clusterParam !== null ? Number(clusterParam) : null;
  const limit = Number(params.get("limit") ?? 24);
  const offset = Number(params.get("offset") ?? 0);

  if (budget !== null && (!Number.isFinite(budget) || budget < 1 || budget > 4)) {
    return NextResponse.json({ detail: "Invalid budget" }, { status: 400 });
  }
  if (cluster !== null && (!Number.isFinite(cluster) || cluster < 0)) {
    return NextResponse.json({ detail: "Invalid cluster" }, { status: 400 });
  }
  if (!Number.isFinite(limit) || !Number.isFinite(offset) || limit < 1 || offset < 0) {
    return NextResponse.json({ detail: "Invalid pagination" }, { status: 400 });
  }

  const result = searchCatalogue({
    q: params.get("q") ?? undefined,
    ids: params.getAll("id"),
    family: params.getAll("family"),
    season: params.getAll("season"),
    time: params.getAll("time"),
    budget,
    gender: params.get("gender") ?? "any",
    cluster,
    sort: sort as "popularity" | "name" | "year" | "recent",
    limit,
    offset,
  });

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
    },
  });
}
