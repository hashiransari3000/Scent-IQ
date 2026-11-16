import type { Perfume, Recommendation, UserProfile } from "./types";

const FAMILY_SLUGS = [
  "wood_root",
  "white_bloom",
  "petal_garden",
  "green_leaf",
  "velvet_sweet",
  "sunlit_citrus",
  "spice_route",
  "orchard_fruit",
  "amber_resin",
  "powder_veil",
  "skin_musk",
  "smoke_leather",
  "salt_mineral",
  "oud_court",
] as const;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    na += a[index] * a[index];
    nb += b[index] * b[index];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

function joinNotes(notes: string[], max = 3): string {
  if (notes.length <= 1) return notes[0] ?? "a balanced accord";
  const shown = notes.slice(0, max);
  if (shown.length === 1) return shown[0];
  return `${shown.slice(0, -1).join(", ")} & ${shown.at(-1)}`;
}

export function rankOnDevice(
  pool: Perfume[],
  profile: UserProfile,
  limit = 12,
): Recommendation[] {
  const loved = pool.filter((perfume) => profile.lovedIds.includes(perfume.id));
  const loveNotes = new Set(profile.loveNotes.map(normalize));
  const avoidNotes = new Set(profile.avoidNotes.map(normalize));
  const seasons = new Set(profile.seasons);
  const times = new Set(profile.times);
  const historyClusters = new Set(loved.map((perfume) => perfume.clusterId));

  const weights = new Array(FAMILY_SLUGS.length).fill(0);
  for (const perfume of loved) {
    for (let index = 0; index < FAMILY_SLUGS.length; index += 1) {
      weights[index] += perfume.familyWeights?.[FAMILY_SLUGS[index]] ?? 0;
    }
  }
  const familyCount = Math.max(1, loved.length);
  for (let index = 0; index < weights.length; index += 1) weights[index] /= familyCount;
  for (const slug of profile.families) {
    const index = FAMILY_SLUGS.indexOf(slug as (typeof FAMILY_SLUGS)[number]);
    if (index >= 0) weights[index] += 0.6;
  }
  if (weights.every((value) => value === 0)) weights.fill(1);

  const scored = pool
    .filter((perfume) => !profile.lovedIds.includes(perfume.id))
    .filter((perfume) => !profile.excludeIds.includes(perfume.id))
    .map((perfume) => {
      const familyVector = FAMILY_SLUGS.map((slug) => perfume.familyWeights?.[slug] ?? 0);
      const familyFit = Math.max(0, cosine(weights, familyVector));
      const shared = perfume.notes.filter((note) => loveNotes.has(normalize(note)));
      const conflicts = perfume.notes.filter((note) => avoidNotes.has(normalize(note)));
      const noteFit = loveNotes.size ? Math.min(1, shared.length / Math.min(4, loveNotes.size)) : 0;
      const seasonFit = seasons.size
        ? perfume.seasons.filter((season) => seasons.has(season)).length / seasons.size
        : 0.6;
      const timeFit = times.size
        ? perfume.times.filter((time) => times.has(time)).length / times.size
        : 0.6;
      const budgetFit =
        profile.budgetTier === null ? 0.8 : perfume.priceTier <= profile.budgetTier ? 1 : 0.25;
      const clusterFit = historyClusters.size
        ? historyClusters.has(perfume.clusterId)
          ? 1
          : 0.35
        : 0.5;
      const popularity =
        perfume.popularityRank == null ? 0.4 : Math.max(0.2, 1 - perfume.popularityRank / 1600);
      const score =
        0.34 * familyFit +
        0.16 * noteFit +
        0.14 * seasonFit +
        0.1 * timeFit +
        0.12 * budgetFit +
        0.08 * clusterFit +
        0.06 * popularity -
        0.18 * Math.min(1, conflicts.length / 2);

      const reasons: string[] = [];
      if (shared.length) reasons.push(`Shares ${joinNotes(shared)} with the notes you love.`);
      if (profile.families.includes(perfume.familySlug ?? "")) {
        reasons.push(`Its ${perfume.family} character is one you picked.`);
      }
      if (seasonFit > 0 && seasons.size) {
        reasons.push(`Aligned with ${perfume.seasons.filter((s) => seasons.has(s)).join(" and ")}.`);
      }
      if (profile.budgetTier && perfume.priceTier <= profile.budgetTier) {
        reasons.push("Inside your selected budget tier.");
      }
      if (!reasons.length) reasons.push(`A ${perfume.family.toLowerCase()} composition worth exploring.`);

      return {
        ...perfume,
        match: Math.max(1, Math.min(99, Math.round(42 + 54 * Math.max(0, score)))),
        matchLabel: score >= 0.62 ? "Strong match" : score >= 0.45 ? "Good match" : "Worth exploring",
        reasons: reasons.slice(0, 4),
        conflicts: conflicts.length
          ? [`Contains ${joinNotes(conflicts)}, which you asked to avoid.`]
          : [],
        breakdown: {
          content: familyFit,
          tree: 0,
          cluster: clusterFit,
          quality: popularity,
          noteOverlap: noteFit,
          avoidConflict: conflicts.length ? 1 : 0,
        },
      } satisfies Recommendation;
    })
    .sort((a, b) => b.match - a.match);

  return scored.slice(0, limit);
}
