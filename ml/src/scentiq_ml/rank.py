"""Online recommendation engine: content similarity, tree rerank, MMR, explanations."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from .config import (
    ARTIFACTS,
    CATALOGUE_JSON,
    FEATURE_IMPORTANCE_JSON,
    PERFUMES_PARQUET,
    QUALITY_JSON,
)
from .families import (
    FAMILY_BY_NAME,
    FAMILY_BY_SLUG,
    FAMILY_SLUGS,
    normalize_note,
    note_family_weights,
)
from .pairwise import (
    CONCENTRATION_SCORE,
    build_pair_matrix,
    normalized_popularity,
    note_sets,
)

MATCH_WEIGHTS = {"content": 0.40, "tree": 0.30, "cluster": 0.20, "quality": 0.10}
MMR_LAMBDA = 0.72


class RecommendationEngine:
    def __init__(self, artifacts: Path = ARTIFACTS) -> None:
        self.artifacts = artifacts
        frame = pd.read_parquet(PERFUMES_PARQUET)
        bundle = joblib.load(artifacts / "tree.joblib")
        self.tree = bundle["model"]
        self.feature_names: list[str] = bundle["features"]
        self.k = int(bundle["k"])

        vectors = np.load(artifacts / "vectors.npz", allow_pickle=False)
        self.ids = [str(value) for value in vectors["ids"]]
        self.vectors = vectors["vectors"].astype(np.float32)
        self.coords = vectors["coords"].astype(np.float32)

        frame["id"] = frame["id"].astype(str)
        self.df = frame.set_index("id").loc[self.ids].reset_index()
        self.id_to_index = {perfume_id: i for i, perfume_id in enumerate(self.ids)}

        self.fam_matrix = self.df[[f"fam_{slug}" for slug in FAMILY_SLUGS]].to_numpy(
            dtype=float
        )
        self.price_tiers = self.df["price_tier"].to_numpy(dtype=int)
        self.cluster_ids = self.df["cluster_id"].to_numpy(dtype=int)
        self.seasons = [list(value) for value in self.df["seasons"]]
        self.times = [list(value) for value in self.df["times_of_day"]]
        self.genders = self.df["gender"].tolist()
        self.note_sets = note_sets(self.df["notes"])
        self.popularity = normalized_popularity(self.df)
        self.concentration = np.array(
            [CONCENTRATION_SCORE.get(value, 0.6) for value in self.df["concentration"]],
            dtype=float,
        )
        self.cluster_meta = json.loads((artifacts / "cluster_meta.json").read_text(encoding="utf-8"))
        self.feature_meta = json.loads((artifacts / "feature_meta.json").read_text(encoding="utf-8"))
        self.similar = (
            json.loads((artifacts / "similar.json").read_text(encoding="utf-8"))
            if (artifacts / "similar.json").exists()
            else {}
        )
        self.metrics = (
            json.loads((artifacts / "metrics.json").read_text(encoding="utf-8"))
            if (artifacts / "metrics.json").exists()
            else {}
        )
        self.cluster_names = {
            int(cluster["id"]): cluster["name"] for cluster in self.cluster_meta["clusters"]
        }
        self.training_notes = self._global_note_counts()

    def _global_note_counts(self) -> Counter[str]:
        counts: Counter[str] = Counter()
        for notes in self.df["notes"]:
            counts.update(set(notes))
        return counts

    # ------------------------------------------------------------------ profile
    def _build_user(self, profile: dict[str, Any]) -> dict[str, Any]:
        loved = [str(value) for value in profile.get("loved_ids", []) if str(value) in self.id_to_index]
        loved_idx = [self.id_to_index[value] for value in loved]
        love_notes = {
            normalize_note(note)
            for note in (profile.get("love_notes") or [])
            if normalize_note(note)
        }
        avoid_notes = {
            normalize_note(note)
            for note in (profile.get("avoid_notes") or [])
            if normalize_note(note)
        }

        weights = np.zeros(len(FAMILY_SLUGS))
        if loved_idx:
            weights += self.fam_matrix[loved_idx].mean(axis=0)
        for note in love_notes:
            for slug, value in note_family_weights(note).items():
                weights[FAMILY_SLUGS.index(slug)] += 0.35 * value
        for slug in profile.get("families", []) or []:
            if slug in FAMILY_SLUGS:
                weights[FAMILY_SLUGS.index(slug)] += 1.0
        if weights.sum() <= 0:
            weights = np.ones(len(FAMILY_SLUGS))
        weights = weights / weights.sum()

        seasons = {
            str(value).lower()
            for value in (profile.get("seasons") or [])
            if str(value).lower() in {"spring", "summer", "autumn", "winter"}
        }
        times = {
            str(value).lower()
            for value in (profile.get("times") or [])
            if str(value).lower() in {"day", "evening", "night"}
        }
        budget = profile.get("budget_tier", profile.get("budget"))
        try:
            budget = int(budget) if budget is not None else None
        except (TypeError, ValueError):
            budget = None
        if budget is not None:
            budget = max(1, min(4, budget))

        return {
            "weights": weights,
            "love_notes": love_notes,
            "avoid_notes": avoid_notes,
            "seasons": seasons,
            "times": times,
            "budget": budget,
            "gender": str(profile.get("gender") or "any").lower(),
            "history_ids": loved,
            "history_clusters": [int(self.cluster_ids[index]) for index in loved_idx],
            "loved_idx": loved_idx,
        }

    # ----------------------------------------------------------------- filters
    def _allowed_indices(
        self, filters: dict[str, Any], exclude: set[str]
    ) -> list[int]:
        families: list[str] = []
        raw_family = filters.get("families") or filters.get("family")
        if isinstance(raw_family, str):
            raw_family = [raw_family]
        for value in raw_family or []:
            text = str(value)
            family = FAMILY_BY_SLUG.get(text)
            families.append(family.slug if family else text)
        family_names = {
            FAMILY_BY_SLUG[slug].name for slug in families if slug in FAMILY_BY_SLUG
        } | set(families)

        seasons = {str(value).lower() for value in (filters.get("seasons") or [])}
        times = {str(value).lower() for value in (filters.get("times") or [])}
        required_notes = {
            normalize_note(note)
            for note in (filters.get("notes") or [])
            if normalize_note(note)
        }
        budget_max = filters.get("budget_max")
        budget_max = int(budget_max) if budget_max is not None else None
        gender = str(filters.get("gender") or "any").lower()
        query = str(filters.get("query") or "").strip().lower()

        allowed: list[int] = []
        for index in range(len(self.df)):
            if self.ids[index] in exclude:
                continue
            row_family = self.df.at[index, "family"]
            secondary = self.df.at[index, "secondary_family"]
            if family_names and row_family not in family_names and secondary not in family_names:
                continue
            if seasons and not seasons.intersection(self.seasons[index]):
                continue
            if times and not times.intersection(self.times[index]):
                continue
            if required_notes and not required_notes.intersection(self.note_sets[index]):
                continue
            if budget_max is not None and int(self.price_tiers[index]) > budget_max:
                continue
            if gender != "any" and self.genders[index] not in {"unisex", gender}:
                continue
            if query:
                haystack = " ".join(
                    [
                        str(self.df.at[index, "name"]),
                        str(self.df.at[index, "house"]),
                        str(self.df.at[index, "description"]),
                    ]
                ).lower()
                if query not in haystack:
                    continue
            allowed.append(index)
        return allowed

    # ------------------------------------------------------------------- score
    def _score(
        self, indices: list[int], user: dict[str, Any]
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        candidates = np.asarray(indices, dtype=int)
        matrix = build_pair_matrix(
            user,
            candidates,
            fam_matrix=self.fam_matrix,
            price_tiers=self.price_tiers,
            seasons=self.seasons,
            times=self.times,
            genders=self.genders,
            note_sets_by_id=self.note_sets,
            popularity=self.popularity,
            concentration_scores=self.concentration,
            cluster_ids=self.cluster_ids,
            k=self.k,
        )
        tree_probability = self.tree.predict_proba(matrix)[:, 1]

        family_cosine = matrix[:, 2]
        if user["loved_idx"]:
            target = self.vectors[user["loved_idx"]].mean(axis=0)
            norm = np.linalg.norm(target)
            target = target / norm if norm else target
            vector_similarity = np.clip(self.vectors[candidates] @ target, 0.0, 1.0)
            content = 0.55 * family_cosine + 0.45 * vector_similarity
        else:
            content = family_cosine
        if user["love_notes"]:
            content = 0.78 * content + 0.22 * matrix[:, 0]

        cluster_affinity = matrix[:, 3]
        quality = 0.5 * matrix[:, 8] + 0.5 * matrix[:, 9]
        score = (
            MATCH_WEIGHTS["content"] * content
            + MATCH_WEIGHTS["tree"] * tree_probability
            + MATCH_WEIGHTS["cluster"] * cluster_affinity
            + MATCH_WEIGHTS["quality"] * quality
            - 0.12 * matrix[:, 1]
        )
        return np.clip(score, 0.0, 1.0), tree_probability, matrix, np.clip(content, 0.0, 1.0)

    def _mmr(self, candidates: np.ndarray, relevance: np.ndarray, limit: int) -> list[int]:
        selected: list[int] = []
        available = list(range(len(candidates)))
        while available and len(selected) < limit:
            if not selected:
                best_local = max(available, key=lambda row: relevance[row])
            else:
                chosen_vectors = self.vectors[candidates[selected]]
                best_score = -np.inf
                best_local = available[0]
                for row in available:
                    similarity = float(
                        np.max(chosen_vectors @ self.vectors[candidates[row]])
                    )
                    mmr = MMR_LAMBDA * relevance[row] - (1 - MMR_LAMBDA) * similarity
                    if mmr > best_score:
                        best_score = mmr
                        best_local = row
            selected.append(best_local)
            available.remove(best_local)
        return [int(candidates[row]) for row in selected]

    # ------------------------------------------------------------- explanations
    def _explain_row(
        self,
        index: int,
        user: dict[str, Any],
        matrix_row: np.ndarray,
        tree_probability: float,
        score: float,
        content_score: float,
    ) -> dict[str, Any]:
        row = self.df.iloc[index]
        candidate_notes = {
            normalize_note(note): note for note in row["notes"]
        }
        shared = [original for key, original in candidate_notes.items() if key in user["love_notes"]]
        conflicts = [original for key, original in candidate_notes.items() if key in user["avoid_notes"]]

        reasons: list[str] = []
        if shared:
            reasons.append(
                f"Shares {', '.join(shared[:3])} with notes you told us you love."
            )

        profile_families = np.argsort(-user["weights"])[:3]
        profile_family_names = {
            FAMILY_BY_SLUG[FAMILY_SLUGS[int(i)]].name for i in profile_families
        }
        if row["family"] in profile_family_names:
            reasons.append(
                f"Its {row['family']} character sits at the centre of your scent profile."
            )
        elif row["secondary_family"] in profile_family_names:
            reasons.append(
                f"It carries a {row['secondary_family']} thread that matches your taste."
            )

        shared_seasons = sorted(set(self.seasons[index]).intersection(user["seasons"]))
        if shared_seasons:
            reasons.append(f"Built for {', '.join(shared_seasons)} wear.")

        if user["budget"] is not None and int(row["price_tier"]) <= user["budget"]:
            reasons.append("It stays inside the budget tier you selected.")

        cluster_id = int(self.cluster_ids[index])
        if user["history_clusters"] and float(matrix_row[3]) >= 0.5:
            reasons.append(
                f"It falls in the {self.cluster_names.get(cluster_id, 'same')} cluster, "
                "close to perfumes already in your wardrobe."
            )
        if self.popularity[index] >= 0.85 and len(reasons) < 4:
            reasons.append("It is one of the more recognised compositions in the catalogue.")

        if not reasons:
            reasons.append(
                f"A {str(row['family']).lower()} composition with "
                f"{', '.join(list(row['notes'])[:3]) or 'a balanced accord'}."
            )

        breakdown = {
            "content": round(float(content_score), 4),
            "tree": round(float(tree_probability), 4),
            "cluster": round(float(matrix_row[3]), 4),
            "quality": round(float(0.5 * matrix_row[8] + 0.5 * matrix_row[9]), 4),
            "noteOverlap": round(float(matrix_row[0]), 4),
            "avoidConflict": round(float(matrix_row[1]), 4),
        }
        match = round(100 * float(score))
        return {
            "match": max(1, min(99, match)),
            "matchLabel": (
                "Strong match" if match >= 75 else "Good match" if match >= 60 else "Worth exploring"
            ),
            "reasons": reasons[:4],
            "conflicts": (
                [f"Contains {', '.join(conflicts[:3])}, which you asked to avoid."] if conflicts else []
            ),
            "breakdown": breakdown,
        }

    def _card(self, index: int) -> dict[str, Any]:
        row = self.df.iloc[index]
        family = FAMILY_BY_NAME.get(str(row["family"]))
        perfume_id = str(row["id"])
        return {
            "id": perfume_id,
            "name": row["name"],
            "house": row["house"],
            "year": int(row["year"]) if pd.notna(row["year"]) else None,
            "concentration": row["concentration"],
            "family": row["family"],
            "secondaryFamily": row["secondary_family"],
            "familySlug": family.slug if family else "wood_root",
            "familyColor": family.color if family else "#8A6748",
            "character": list(row["character"]),
            "seasons": list(row["seasons"]),
            "times": list(row["times_of_day"]),
            "topNotes": list(row["top_notes"]),
            "heartNotes": list(row["heart_notes"]),
            "baseNotes": list(row["base_notes"]),
            "notes": list(row["notes"]),
            "description": row["description"],
            "priceTier": int(row["price_tier"]),
            "priceTierSource": row["price_tier_source"],
            "gender": row["gender"],
            "imageKey": row["image_key"],
            "clusterId": int(row["cluster_id"]),
            "clusterName": self.cluster_names.get(int(row["cluster_id"])),
            "similarIds": self.similar.get(perfume_id, []),
            "coordinates": [
                round(float(self.coords[index, 0]), 4),
                round(float(self.coords[index, 1]), 4),
            ],
            "url": row["url"],
        }

    # -------------------------------------------------------------------- API
    def recommend(self, profile: dict[str, Any]) -> dict[str, Any]:
        user = self._build_user(profile)
        limit = max(1, min(50, int(profile.get("limit", 12))))
        filters = profile.get("filters") or {}
        strict = bool(filters.get("strict", False))
        exclude = set(user["history_ids"]) | {
            str(value) for value in profile.get("exclude_ids", [])
        }
        allowed = self._allowed_indices(filters, exclude)
        relaxed = False
        if len(allowed) < limit and not strict:
            relaxed = True
            extra = [
                index
                for index in self._allowed_indices({}, exclude)
                if index not in set(allowed)
            ]
            allowed.extend(extra)

        if not allowed:
            return {"items": [], "meta": {"considered": 0, "returned": 0, "relaxedFilters": False}}

        score, tree_probability, matrix, content = self._score(allowed, user)
        selected = self._mmr(np.asarray(allowed, dtype=int), score, limit)
        local = {int(index): row for row, index in enumerate(allowed)}
        items = []
        for index in selected:
            row = local[index]
            explanation = self._explain_row(
                index,
                user,
                matrix[row],
                float(tree_probability[row]),
                float(score[row]),
                float(content[row]),
            )
            items.append({**self._card(index), **explanation})

        return {
            "items": items,
            "meta": {
                "considered": len(allowed),
                "returned": len(items),
                "relaxedFilters": relaxed,
                "model": "content + decision-tree hybrid with MMR diversity",
                "weights": MATCH_WEIGHTS,
            },
        }

    def explain(self, perfume_id: str, profile: dict[str, Any]) -> dict[str, Any]:
        if perfume_id not in self.id_to_index:
            raise KeyError(f"Unknown perfume id: {perfume_id}")
        index = self.id_to_index[perfume_id]
        user = self._build_user(profile)
        score, tree_probability, matrix, content = self._score([index], user)
        explanation = self._explain_row(
            index,
            user,
            matrix[0],
            float(tree_probability[0]),
            float(score[0]),
            float(content[0]),
        )
        return {**self._card(index), **explanation}

    def perfume(self, perfume_id: str) -> dict[str, Any]:
        if perfume_id not in self.id_to_index:
            raise KeyError(f"Unknown perfume id: {perfume_id}")
        index = self.id_to_index[perfume_id]
        card = self._card(index)
        card["similar"] = [
            self._card(self.id_to_index[value])
            for value in card["similarIds"][:8]
            if value in self.id_to_index
        ]
        return card

    def similar_to(self, perfume_id: str, limit: int = 12) -> list[dict[str, Any]]:
        if perfume_id not in self.id_to_index:
            raise KeyError(f"Unknown perfume id: {perfume_id}")
        index = self.id_to_index[perfume_id]
        values = self.similar.get(perfume_id, [])
        if not values:
            similarity = self.vectors @ self.vectors[index]
            order = np.argsort(-similarity)[1 : limit + 1]
            values = [self.ids[i] for i in order]
        return [self._card(self.id_to_index[value]) for value in values[:limit] if value in self.id_to_index]

    def catalogue(self, filters: dict[str, Any] | None = None, limit: int = 40, offset: int = 0) -> dict[str, Any]:
        filters = filters or {}
        exclude = {str(value) for value in filters.get("exclude_ids", [])}
        allowed = self._allowed_indices(filters, exclude)
        allowed.sort(
            key=lambda index: (
                pd.isna(self.df.at[index, "popularity_rank"]),
                -float(self.popularity[index]),
            )
        )
        window = allowed[offset : offset + max(1, min(100, limit))]
        return {
            "items": [self._card(index) for index in window],
            "total": len(allowed),
            "offset": offset,
            "limit": limit,
        }

    def taxonomy(self) -> dict[str, Any]:
        family_counts = self.df["family"].value_counts().to_dict()
        top_notes = [{"note": note, "count": count} for note, count in self.training_notes.most_common(60)]
        return {
            "families": [
                {
                    "name": family.name,
                    "slug": family.slug,
                    "color": family.color,
                    "gradientStart": family.gradient_start,
                    "gradientEnd": family.gradient_end,
                    "description": family.description,
                    "count": int(family_counts.get(family.name, 0)),
                }
                for family in (FAMILY_BY_SLUG[slug] for slug in FAMILY_SLUGS)
            ],
            "clusters": [
                {
                    "id": cluster["id"],
                    "name": cluster["name"],
                    "description": cluster["description"],
                    "topNotes": cluster["topNotes"],
                    "primaryFamily": cluster["primaryFamily"],
                    "secondaryFamily": cluster["secondaryFamily"],
                    "size": cluster["size"],
                    "color": cluster["color"],
                }
                for cluster in self.cluster_meta["clusters"]
            ],
            "topNotes": top_notes,
        }

    def model_info(self) -> dict[str, Any]:
        quality = (
            json.loads(QUALITY_JSON.read_text(encoding="utf-8"))
            if QUALITY_JSON.exists()
            else {}
        )
        feature_importance = (
            json.loads(FEATURE_IMPORTANCE_JSON.read_text(encoding="utf-8"))
            if FEATURE_IMPORTANCE_JSON.exists()
            else []
        )
        catalogue = (
            json.loads(CATALOGUE_JSON.read_text(encoding="utf-8"))
            if CATALOGUE_JSON.exists()
            else {}
        )
        return {
            "catalogue": {
                "perfumes": len(self.df),
                "houses": int(self.df["house"].nunique()),
                "notes": len(self.training_notes),
                "source": catalogue.get("source"),
                "attribution": catalogue.get("attribution"),
            },
            "features": {
                "svdComponents": self.feature_meta.get("svd_components"),
                "tfidfFeatures": self.feature_meta.get("tfidf_features"),
                "explainedVariance": self.feature_meta.get("explained_variance"),
                "modelFeatures": self.feature_names,
            },
            "clusters": {
                "k": self.k,
                "silhouette": self.cluster_meta.get("silhouette"),
                "daviesBouldin": self.cluster_meta.get("davies_bouldin"),
                "sizes": self.cluster_meta.get("sizes"),
                "names": [cluster["name"] for cluster in self.cluster_meta["clusters"]],
            },
            "classifier": {
                "type": "DecisionTreeClassifier",
                "metrics": self.metrics.get("classification"),
                "ranking": self.metrics.get("ranking"),
                "baseline": self.metrics.get("baseline_ranking"),
                "depth": self.metrics.get("tree", {}).get("depth"),
                "leaves": self.metrics.get("tree", {}).get("leaves"),
                "topFeatures": feature_importance[:8],
            },
            "rankingWeights": MATCH_WEIGHTS,
            "quality": {
                "noteCoverage": quality.get("note_use_coverage"),
                "cleanRows": quality.get("clean_rows"),
                "missingPopularity": (quality.get("missing") or {}).get("popularity_rank"),
            },
            "limitations": [
                "Enjoyment labels come from simulated archetype users, not real people.",
                "Price tiers are estimated from house positioning, never retail prices.",
                "Match percentages express relative fit, not a probability of purchase.",
                "Real feedback replaces simulation labels once enough interactions exist.",
            ],
            "attribution": "Scento Perfume Database (CC BY 4.0)",
        }
