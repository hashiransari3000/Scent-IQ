import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PRICE_TIER_LABELS: Record<number, string> = {
  1: "Accessible",
  2: "Designer",
  3: "Premium",
  4: "Luxury",
};

export function priceTierLabel(tier: number): string {
  return PRICE_TIER_LABELS[tier] ?? "Estimate";
}

export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatYear(year: number | null | undefined): string {
  return year ? String(year) : "Year unknown";
}

export function seasonLabel(season: string): string {
  return season.charAt(0).toUpperCase() + season.slice(1);
}

export function timeLabel(time: string): string {
  return time === "day" ? "Daytime" : time === "evening" ? "Evening" : "Night";
}

export function percentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
