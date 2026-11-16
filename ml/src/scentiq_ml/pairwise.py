"""Features shared by model training and online recommendation."""

from __future__ import annotations

from collections.abc import Iterable
from typing import Any

import numpy as np
import pandas as pd

from .families import normalize_note

BASE_FEATURES: tuple[str, ...] = (
    "note_overlap",
    "avoid_conflict",
    "family_cosine",
    "cluster_affinity",
    "price_fit",
    "season_match",
    "time_match",
    "gender_match",
    "popularity",
    "concentration_score",
)

CONCENTRATION_SCORE = {
    "Parfum": 1.0,
    "Extrait de Parfum": 1.0,
    "Eau de Parfum": 0.9,
    "Elixir": 0.85,
    "Eau de Toilette": 0.7,
    "Eau de Cologne": 0.5,
    "Unknown": 0.6,
}


def feature_names(k: int) -> list[str]:
    return list(BASE_FEATURES) + [f"cluster_{i}" for i in range(k)]


def normalized_popularity(df: pd.DataFrame) -> np.ndarray:
    ranks = df["popularity_rank"].astype(float).to_numpy()
    valid = ~np.isnan(ranks)
    result = np.full(len(df), 0.35, dtype=float)
    if valid.any():
        lo, hi = np.nanmin(ranks[valid]), np.nanmax(ranks[valid])
        result[valid] = 1.0 - (ranks[valid] - lo) / max(hi - lo, 1.0)
    return result


def note_sets(notes_column: Iterable[Iterable[str]]) -> list[set[str]]:
    return [{normalize_note(note) for note in notes} for notes in notes_column]


def build_pair_matrix(
    user: dict[str, Any],
    candidates: np.ndarray,
    *,
    fam_matrix: np.ndarray,
    price_tiers: np.ndarray,
    seasons: list[list[str]],
    times: list[list[str]],
    genders: list[str],
    note_sets_by_id: list[set[str]],
    popularity: np.ndarray,
    concentration_scores: np.ndarray,
    cluster_ids: np.ndarray,
    k: int,
) -> np.ndarray:
    """Build the exact feature matrix the decision tree expects."""

    candidates = np.asarray(candidates, dtype=int)
    weights = np.asarray(user["weights"], dtype=float)
    love = set(user.get("love_notes", []))
    avoid = set(user.get("avoid_notes", []))
    user_seasons = set(user.get("seasons", []))
    user_times = set(user.get("times", []))
    budget = user.get("budget")
    gender = user.get("gender", "any")

    n = len(candidates)
    note_overlap = np.zeros(n)
    avoid_conflict = np.zeros(n)
    season_match = np.ones(n)
    time_match = np.ones(n)
    gender_match = np.ones(n)

    love_denom = max(1, len(love))
    avoid_denom = max(1, len(avoid))
    for row, index in enumerate(candidates):
        notes = note_sets_by_id[index]
        note_overlap[row] = len(notes & love) / love_denom
        avoid_conflict[row] = len(notes & avoid) / avoid_denom
        if user_seasons:
            season_match[row] = len(user_seasons.intersection(seasons[index])) / len(
                user_seasons
            )
        if user_times:
            time_match[row] = len(user_times.intersection(times[index])) / len(user_times)
        if gender != "any" and genders[index] != "unisex" and genders[index] != gender:
            gender_match[row] = 0.0

    family_cosine = np.clip(fam_matrix[candidates] @ weights, 0.0, 1.0)

    history = user.get("history_clusters", [])
    if history:
        counts = np.bincount(history, minlength=k)
        cluster_affinity = (counts[cluster_ids[candidates]] + 0.5) / (len(history) + 1)
    else:
        cluster_affinity = np.full(n, 0.5)

    tiers = price_tiers[candidates].astype(float)
    if budget is None:
        price_fit = np.ones(n)
    else:
        price_fit = np.where(
            tiers <= budget, 1.0, np.maximum(0.0, 1.0 - 0.3 * (tiers - budget))
        )

    clusters = np.zeros((n, k))
    clusters[np.arange(n), cluster_ids[candidates]] = 1.0

    return np.column_stack(
        [
            note_overlap,
            avoid_conflict,
            family_cosine,
            cluster_affinity,
            price_fit,
            season_match,
            time_match,
            gender_match,
            popularity[candidates],
            concentration_scores[candidates],
            clusters,
        ]
    )
