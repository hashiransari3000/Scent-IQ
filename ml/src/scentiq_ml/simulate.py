"""Simulate realistic users with hidden taste and generate labelled pairs.

Each synthetic user has a private archetype (hidden preference vector). The model
never sees that vector: it sees the user's stated seasons/times/budget, their
favourite notes, and the perfumes in their wardrobe. This mirrors the real
onboarding flow and prevents the trivial leakage of predicting from the exact
generator weights.
"""

from __future__ import annotations

from collections import Counter
from typing import Any

import numpy as np
import pandas as pd

from .families import FAMILY_SLUGS, normalize_note, note_family_weights
from .pairwise import (
    CONCENTRATION_SCORE,
    build_pair_matrix,
    feature_names,
    normalized_popularity,
    note_sets,
)

ARCHETYPES: list[dict[str, Any]] = [
    {
        "name": "Oud Royalist",
        "weights": {"oud_court": 5, "amber_resin": 4, "spice_route": 3, "wood_root": 3,
                    "smoke_leather": 2, "petal_garden": 1},
        "seasons": {"autumn": 3, "winter": 3, "spring": 1, "summer": 0.5},
        "times": {"evening": 3, "night": 2, "day": 1},
        "budget": (3, 4),
    },
    {
        "name": "Amber Romantic",
        "weights": {"amber_resin": 5, "velvet_sweet": 3, "spice_route": 2, "wood_root": 2,
                    "powder_veil": 2, "oud_court": 1},
        "seasons": {"autumn": 3, "winter": 2, "spring": 2, "summer": 1},
        "times": {"evening": 3, "day": 2, "night": 1},
        "budget": (2, 4),
    },
    {
        "name": "Fresh Citric",
        "weights": {"sunlit_citrus": 5, "green_leaf": 3, "salt_mineral": 2,
                    "white_bloom": 2, "orchard_fruit": 1, "wood_root": 1},
        "seasons": {"spring": 3, "summer": 3, "autumn": 1, "winter": 0.5},
        "times": {"day": 3, "evening": 1, "night": 0.5},
        "budget": (1, 3),
    },
    {
        "name": "Green Gardener",
        "weights": {"green_leaf": 5, "wood_root": 3, "petal_garden": 2, "salt_mineral": 2,
                    "sunlit_citrus": 2, "white_bloom": 1},
        "seasons": {"spring": 3, "summer": 2, "autumn": 1, "winter": 0.5},
        "times": {"day": 3, "evening": 1},
        "budget": (1, 3),
    },
    {
        "name": "White Floral Minimalist",
        "weights": {"white_bloom": 5, "powder_veil": 3, "petal_garden": 2, "skin_musk": 2,
                    "green_leaf": 1, "sunlit_citrus": 1},
        "seasons": {"spring": 3, "summer": 2, "autumn": 1, "winter": 1},
        "times": {"day": 3, "evening": 2},
        "budget": (2, 4),
    },
    {
        "name": "Rose Collector",
        "weights": {"petal_garden": 5, "white_bloom": 2, "powder_veil": 2,
                    "orchard_fruit": 2, "velvet_sweet": 1, "spice_route": 1},
        "seasons": {"spring": 3, "autumn": 2, "summer": 1, "winter": 1},
        "times": {"day": 2, "evening": 3},
        "budget": (2, 4),
    },
    {
        "name": "Gourmand Night",
        "weights": {"velvet_sweet": 5, "orchard_fruit": 3, "amber_resin": 3,
                    "spice_route": 2, "powder_veil": 2, "wood_root": 1},
        "seasons": {"autumn": 3, "winter": 2, "spring": 1, "summer": 1},
        "times": {"evening": 3, "night": 2, "day": 1},
        "budget": (1, 3),
    },
    {
        "name": "Smoky Leather",
        "weights": {"smoke_leather": 5, "wood_root": 3, "spice_route": 3, "oud_court": 2,
                    "amber_resin": 2, "salt_mineral": 1},
        "seasons": {"autumn": 3, "winter": 3, "spring": 1, "summer": 0.5},
        "times": {"night": 3, "evening": 2, "day": 0.5},
        "budget": (3, 4),
    },
    {
        "name": "Skin Musk Purist",
        "weights": {"skin_musk": 5, "powder_veil": 3, "white_bloom": 2, "amber_resin": 2,
                    "wood_root": 1, "salt_mineral": 1},
        "seasons": {"spring": 2, "summer": 2, "autumn": 2, "winter": 2},
        "times": {"day": 3, "evening": 1},
        "budget": (2, 4),
    },
    {
        "name": "Fruit Orchard",
        "weights": {"orchard_fruit": 5, "sunlit_citrus": 3, "velvet_sweet": 2,
                    "green_leaf": 2, "petal_garden": 1, "white_bloom": 1},
        "seasons": {"spring": 3, "summer": 3, "autumn": 1, "winter": 0.5},
        "times": {"day": 3, "evening": 1},
        "budget": (1, 3),
    },
    {
        "name": "Salt & Air",
        "weights": {"salt_mineral": 5, "sunlit_citrus": 2, "green_leaf": 2, "wood_root": 2,
                    "white_bloom": 1, "skin_musk": 1},
        "seasons": {"spring": 2, "summer": 3, "autumn": 1, "winter": 1},
        "times": {"day": 3, "evening": 1},
        "budget": (2, 4),
    },
    {
        "name": "Powder Vintage",
        "weights": {"powder_veil": 5, "white_bloom": 3, "petal_garden": 2, "skin_musk": 2,
                    "amber_resin": 2, "wood_root": 1},
        "seasons": {"autumn": 3, "spring": 2, "winter": 2, "summer": 1},
        "times": {"day": 3, "evening": 1},
        "budget": (2, 4),
    },
]

SEASON_NAMES = ("spring", "summer", "autumn", "winter")
TIME_NAMES = ("day", "evening", "night")


def _notes_by_family(df: pd.DataFrame) -> dict[str, list[str]]:
    counts: dict[str, Counter[str]] = {slug: Counter() for slug in FAMILY_SLUGS}
    for notes in df["notes"]:
        for note in notes:
            weights = note_family_weights(note)
            if not weights:
                continue
            primary = max(weights.items(), key=lambda item: item[1])[0]
            counts[primary][note] += 1
    return {slug: [note for note, _ in counter.most_common()] for slug, counter in counts.items()}


def _sample_notes(
    rng: np.random.Generator,
    pool: list[str],
    size: int,
    exclude: set[str],
) -> list[str]:
    available = [n for n in pool if normalize_note(n) not in exclude]
    if not available:
        return []
    size = min(size, len(available))
    indices = rng.choice(len(available), size=size, replace=False)
    return [available[i] for i in indices]


def _weights_from_notes(notes: list[str]) -> np.ndarray:
    weights = np.zeros(len(FAMILY_SLUGS))
    for note in notes:
        for slug, value in note_family_weights(note).items():
            weights[FAMILY_SLUGS.index(slug)] += value
    total = weights.sum()
    return weights / total if total else weights


def _score_candidates(
    candidates: np.ndarray,
    *,
    hidden_weights: np.ndarray,
    user: dict[str, Any],
    fam_matrix: np.ndarray,
    price_tiers: np.ndarray,
    seasons: list[list[str]],
    times: list[list[str]],
    popularity: np.ndarray,
    rng: np.random.Generator,
) -> np.ndarray:
    family_sim = np.clip(fam_matrix[candidates] @ hidden_weights, 0, 1)
    scores = 1.25 * family_sim
    for row, index in enumerate(candidates):
        if user["seasons"]:
            scores[row] += 0.4 * len(user["seasons"].intersection(seasons[index])) / len(
                user["seasons"]
            )
        if user["times"]:
            scores[row] += 0.3 * len(user["times"].intersection(times[index])) / len(
                user["times"]
            )
        tier = price_tiers[index]
        scores[row] += 0.25 * (1.0 if tier <= user["budget"] else max(0.0, 1 - 0.3 * (tier - user["budget"])))
        scores[row] += 0.2 * popularity[index]
    return scores + rng.normal(0.0, 0.22, len(candidates))


def generate_training_data(
    df: pd.DataFrame,
    k: int,
    *,
    users_per_archetype: int = 30,
    seed: int = 42,
) -> tuple[pd.DataFrame, list[dict[str, Any]]]:
    rng = np.random.default_rng(seed)
    fam_matrix = df[[f"fam_{slug}" for slug in FAMILY_SLUGS]].to_numpy(dtype=float)
    cluster_ids = df["cluster_id"].to_numpy(dtype=int)
    price_tiers = df["price_tier"].to_numpy(dtype=int)
    seasons = [list(value) for value in df["seasons"]]
    times = [list(value) for value in df["times_of_day"]]
    genders = df["gender"].tolist()
    notes = note_sets(df["notes"])
    popularity = normalized_popularity(df)
    concentration = np.array(
        [CONCENTRATION_SCORE.get(value, 0.6) for value in df["concentration"]], dtype=float
    )
    notes_by_family = _notes_by_family(df)
    names = feature_names(k)

    rows: list[dict[str, Any]] = []
    user_summaries: list[dict[str, Any]] = []
    all_indices = np.arange(len(df))

    for archetype_index, archetype in enumerate(ARCHETYPES):
        base = np.array([archetype["weights"].get(slug, 0.0) for slug in FAMILY_SLUGS])
        base = base / base.sum()

        for user_index in range(users_per_archetype):
            hidden = np.clip(base + rng.normal(0, 0.04, len(base)), 0, None)
            hidden = hidden / hidden.sum()

            season_pool = archetype["seasons"]
            season_weights = np.array([season_pool.get(s, 0.0) for s in SEASON_NAMES])
            season_weights = season_weights / season_weights.sum()
            chosen_seasons = rng.choice(
                SEASON_NAMES,
                size=int(rng.integers(2, 4)),
                replace=False,
                p=season_weights,
            )
            time_pool = archetype["times"]
            time_weights = np.array([time_pool.get(t, 0.0) for t in TIME_NAMES])
            time_weights = time_weights / time_weights.sum()
            chosen_times = rng.choice(
                TIME_NAMES,
                size=int(rng.integers(1, 3)),
                replace=False,
                p=time_weights,
            )
            budget = int(rng.integers(archetype["budget"][0], archetype["budget"][1] + 1))
            gender = str(rng.choice(["any", "any", "any", "any", "any", "any", "men", "women"]))

            top_families = [
                slug
                for slug in np.argsort(-hidden)[:4]
                if hidden[slug] > 0.4 * hidden.max()
            ]
            love_notes: list[str] = []
            used: set[str] = set()
            for slug in top_families:
                sample = _sample_notes(
                    rng,
                    notes_by_family[FAMILY_SLUGS[slug]],
                    max(2, 9 // max(1, len(top_families))),
                    used,
                )
                love_notes.extend(sample)
                used.update(normalize_note(note) for note in sample)
            low_families = list(np.argsort(hidden)[:4])
            avoid_notes: list[str] = []
            for slug in low_families:
                sample = _sample_notes(
                    rng, notes_by_family[FAMILY_SLUGS[slug]], 1, used
                )
                avoid_notes.extend(sample)
                used.update(normalize_note(note) for note in sample)

            user = {
                "user_id": f"u{archetype_index:02d}_{user_index:03d}",
                "archetype": archetype["name"],
                "archetype_index": archetype_index,
                "seasons": {str(s) for s in chosen_seasons},
                "times": {str(t) for t in chosen_times},
                "budget": budget,
                "gender": gender,
                "love_notes": [normalize_note(n) for n in love_notes],
                "avoid_notes": [normalize_note(n) for n in avoid_notes],
            }

            # Affinity used only to build plausible wardrobes / candidate sets.
            affinity = fam_matrix @ hidden
            top_pool = np.argsort(-affinity)[:250]
            random_pool = rng.choice(all_indices, size=40, replace=False)
            pool = np.unique(np.concatenate([top_pool, random_pool]))
            wardrobe = rng.choice(pool, size=20, replace=False)
            wardrobe_scores = _score_candidates(
                wardrobe,
                hidden_weights=hidden,
                user=user,
                fam_matrix=fam_matrix,
                price_tiers=price_tiers,
                seasons=seasons,
                times=times,
                popularity=popularity,
                rng=rng,
            )
            liked_order = np.argsort(-wardrobe_scores)[: max(3, round(len(wardrobe) * 0.3))]
            history_idx = wardrobe[liked_order]
            if len(history_idx) > 8:
                history_idx = rng.choice(history_idx, size=8, replace=False)

            history_mean = fam_matrix[history_idx].mean(axis=0)
            observed = 0.75 * history_mean + 0.25 * _weights_from_notes(love_notes)
            user["weights"] = observed / observed.sum()
            user["history_ids"] = df.iloc[history_idx]["id"].tolist()
            user["history_clusters"] = cluster_ids[history_idx].tolist()

            remaining = np.setdiff1d(all_indices, wardrobe, assume_unique=False)
            wardrobe_set = {int(index) for index in wardrobe}
            ranked_remaining = np.array(
                [index for index in np.argsort(-affinity) if int(index) not in wardrobe_set]
            )[:350]
            candidate_pool = np.unique(
                np.concatenate(
                    [
                        ranked_remaining,
                        rng.choice(remaining, size=180, replace=False),
                    ]
                )
            )
            candidates = rng.choice(
                candidate_pool,
                size=min(160, len(candidate_pool)),
                replace=False,
            )
            candidate_scores = _score_candidates(
                candidates,
                hidden_weights=hidden,
                user=user,
                fam_matrix=fam_matrix,
                price_tiers=price_tiers,
                seasons=seasons,
                times=times,
                popularity=popularity,
                rng=rng,
            )
            threshold = np.quantile(candidate_scores, 0.7)
            labels = (candidate_scores >= threshold).astype(int)

            matrix = build_pair_matrix(
                user,
                candidates,
                fam_matrix=fam_matrix,
                price_tiers=price_tiers,
                seasons=seasons,
                times=times,
                genders=genders,
                note_sets_by_id=notes,
                popularity=popularity,
                concentration_scores=concentration,
                cluster_ids=cluster_ids,
                k=k,
            )
            for row_index, candidate_index in enumerate(candidates):
                record = {
                    "user_id": user["user_id"],
                    "perfume_id": df.iloc[candidate_index]["id"],
                    "archetype": archetype["name"],
                    "liked": int(labels[row_index]),
                    "sim_score": float(candidate_scores[row_index]),
                }
                record.update(
                    {name: float(matrix[row_index, col]) for col, name in enumerate(names)}
                )
                rows.append(record)

            user_summaries.append(
                {
                    "user_id": user["user_id"],
                    "archetype": archetype["name"],
                    "seasons": sorted(user["seasons"]),
                    "times": sorted(user["times"]),
                    "budget": budget,
                    "gender": gender,
                    "love_notes": love_notes,
                    "avoid_notes": avoid_notes,
                    "history_ids": user["history_ids"],
                    "n_candidates": len(candidates),
                    "positive_rate": float(labels.mean()),
                }
            )

    pairs = pd.DataFrame(rows)
    pairs = pairs.sample(frac=1.0, random_state=seed).reset_index(drop=True)
    return pairs, user_summaries
