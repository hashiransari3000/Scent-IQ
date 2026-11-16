export interface FamilyVisual {
  start: string;
  end: string;
  accent: string;
  ink: string;
}

export const FAMILY_VISUALS: Record<string, FamilyVisual> = {
  wood_root: { start: "#24180F", end: "#8A6748", accent: "#C9A878", ink: "#F5F0E6" },
  white_bloom: { start: "#C8B9A2", end: "#F2E9DA", accent: "#8F7B5E", ink: "#221B13" },
  petal_garden: { start: "#7D3E4B", end: "#D79AA5", accent: "#F2C8CF", ink: "#FBF3F4" },
  green_leaf: { start: "#35402C", end: "#9BAA80", accent: "#D5DFC0", ink: "#F6F8F0" },
  velvet_sweet: { start: "#5A3A17", end: "#D2A24C", accent: "#F4D89A", ink: "#1E1408" },
  sunlit_citrus: { start: "#8C6418", end: "#EBC95F", accent: "#FFF1B8", ink: "#241A05" },
  spice_route: { start: "#5A2D17", end: "#C47A4B", accent: "#F0B98E", ink: "#FFF3EA" },
  orchard_fruit: { start: "#6A2E27", end: "#D38B72", accent: "#F4C2AE", ink: "#FFF4EF" },
  amber_resin: { start: "#4A2A12", end: "#B9833F", accent: "#E8BB78", ink: "#FFF4E4" },
  powder_veil: { start: "#8D7771", end: "#E7D4D0", accent: "#FFF4F1", ink: "#261C1A" },
  skin_musk: { start: "#6B5441", end: "#CDBBA1", accent: "#F0E2CC", ink: "#211810" },
  smoke_leather: { start: "#241C18", end: "#6D5A50", accent: "#B79B8B", ink: "#F7EFE9" },
  salt_mineral: { start: "#2F444B", end: "#87A3AE", accent: "#D5E6EB", ink: "#F4FAFC" },
  oud_court: { start: "#2A1A11", end: "#61402F", accent: "#C49A6C", ink: "#FBF0E4" },
};

export function familyVisual(slug?: string | null): FamilyVisual {
  return FAMILY_VISUALS[slug ?? ""] ?? FAMILY_VISUALS.wood_root;
}

export function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}
