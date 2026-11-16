"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { UserProfile } from "./types";

const STORAGE_KEY = "scentiq.profile.v1";
const EVENT = "scentiq:profile";

export const EMPTY_PROFILE: UserProfile = Object.freeze({
  lovedIds: [],
  loveNotes: [],
  avoidNotes: [],
  families: [],
  seasons: [],
  times: [],
  budgetTier: null,
  gender: "any",
  excludeIds: [],
  feedback: {},
  updatedAt: "",
});

let cached: UserProfile | null = null;

function parse(raw: string | null): UserProfile {
  if (!raw) return { ...EMPTY_PROFILE };
  try {
    const value = JSON.parse(raw) as Partial<UserProfile>;
    return {
      lovedIds: Array.isArray(value.lovedIds) ? value.lovedIds : [],
      loveNotes: Array.isArray(value.loveNotes) ? value.loveNotes : [],
      avoidNotes: Array.isArray(value.avoidNotes) ? value.avoidNotes : [],
      families: Array.isArray(value.families) ? value.families : [],
      seasons: Array.isArray(value.seasons) ? value.seasons : [],
      times: Array.isArray(value.times) ? value.times : [],
      budgetTier: typeof value.budgetTier === "number" ? value.budgetTier : null,
      gender: value.gender === "men" || value.gender === "women" ? value.gender : "any",
      excludeIds: Array.isArray(value.excludeIds) ? value.excludeIds : [],
      feedback: value.feedback && typeof value.feedback === "object" ? value.feedback : {},
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
    };
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

function load(): UserProfile {
  if (typeof window === "undefined") return EMPTY_PROFILE;
  if (!cached) {
    cached = parse(window.localStorage.getItem(STORAGE_KEY));
  }
  return cached;
}

function persist(profile: UserProfile) {
  cached = profile;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new Event(EVENT));
  }
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cached = null;
      callback();
    }
  };
  const onLocal = () => callback();
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onLocal);
  };
}

export function readProfile(): UserProfile {
  return load();
}

export function saveProfile(profile: UserProfile) {
  persist({ ...profile, updatedAt: new Date().toISOString() });
}

export function clearProfile() {
  cached = { ...EMPTY_PROFILE };
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(EVENT));
  }
}

export function hasProfile(profile: UserProfile): boolean {
  return Boolean(
    profile.updatedAt &&
      (profile.lovedIds.length ||
        profile.loveNotes.length ||
        profile.families.length ||
        profile.seasons.length),
  );
}

export function toggleValue<T>(values: T[], value: T, max = 99): T[] {
  if (values.includes(value)) return values.filter((item) => item !== value);
  if (values.length >= max) return values;
  return [...values, value];
}

export function recordFeedback(
  profile: UserProfile,
  perfumeId: string,
  verdict: "like" | "dislike",
): UserProfile {
  const feedback = { ...profile.feedback, [perfumeId]: verdict };
  if (verdict === "like") {
    const lovedIds = profile.lovedIds.includes(perfumeId)
      ? profile.lovedIds
      : [...profile.lovedIds, perfumeId].slice(-12);
    return {
      ...profile,
      feedback,
      lovedIds,
      excludeIds: profile.excludeIds.filter((id) => id !== perfumeId),
      updatedAt: new Date().toISOString(),
    };
  }
  const excludeIds = profile.excludeIds.includes(perfumeId)
    ? profile.excludeIds
    : [...profile.excludeIds, perfumeId].slice(-40);
  return {
    ...profile,
    feedback,
    excludeIds,
    lovedIds: profile.lovedIds.filter((id) => id !== perfumeId),
    updatedAt: new Date().toISOString(),
  };
}

export function useProfile() {
  const profile = useSyncExternalStore(subscribe, load, () => EMPTY_PROFILE);
  const update = useCallback((next: UserProfile) => {
    persist({ ...next, updatedAt: new Date().toISOString() });
  }, []);
  const reset = useCallback(() => clearProfile(), []);
  return { profile, update, reset };
}

export function toRecommendRequest(
  profile: UserProfile,
  limit: number,
  filters?: Record<string, unknown>,
) {
  return {
    loved_ids: profile.lovedIds,
    love_notes: profile.loveNotes,
    avoid_notes: profile.avoidNotes,
    families: profile.families,
    seasons: profile.seasons,
    times: profile.times,
    budget_tier: profile.budgetTier,
    gender: profile.gender,
    exclude_ids: profile.excludeIds,
    limit,
    filters: filters ?? {},
  };
}
