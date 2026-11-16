"""K-Means scent clustering and human-readable cluster naming."""

from __future__ import annotations

import json
from collections import Counter

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import davies_bouldin_score, silhouette_score

from .config import ARTIFACTS, RANDOM_STATE
from .families import FAMILY_BY_SLUG, FAMILY_SLUGS, family_display


def choose_k(vectors: np.ndarray, k_min: int = 6, k_max: int = 12) -> tuple[int, list[dict]]:
    scores: list[dict] = []
    rng = np.random.default_rng(RANDOM_STATE)
    sample_size = min(900, len(vectors))
    sample_idx = rng.choice(len(vectors), size=sample_size, replace=False)
    sample = vectors[sample_idx]

    for k in range(k_min, k_max + 1):
        model = KMeans(n_clusters=k, n_init=10, random_state=RANDOM_STATE)
        labels = model.fit_predict(vectors)
        sizes = np.bincount(labels)
        score = float(silhouette_score(sample, labels[sample_idx], metric="cosine"))
        db = float(davies_bouldin_score(sample, labels[sample_idx]))
        scores.append(
            {
                "k": k,
                "silhouette": round(score, 4),
                "davies_bouldin": round(db, 4),
                "min_cluster_size": int(sizes.min()),
                "max_cluster_size": int(sizes.max()),
            }
        )

    eligible = [row for row in scores if row["min_cluster_size"] >= 20]
    best = max(eligible or scores, key=lambda row: row["silhouette"])
    return int(best["k"]), scores


def _cluster_note_profile(
    df: pd.DataFrame, labels: np.ndarray, cluster_id: int, global_counts: Counter[str]
) -> list[str]:
    mask = labels == cluster_id
    subset = df.loc[mask]
    local: Counter[str] = Counter()
    for notes in subset["notes"]:
        local.update(set(notes))

    # Frequent notes make a readable cluster signature; rare, high-lift notes
    # such as "Mint" can be exclusive to a broad woody cluster and mislabel it.
    ranked = [
        note
        for note, count in local.most_common()
        if count >= 5 and global_counts[note] >= 5
    ]
    return ranked[:3]


def _cluster_name(notes: list[str], primary: str, secondary: str) -> str:
    primary_name = family_display(primary)
    if len(notes) >= 2:
        return f"{primary_name} · {notes[0]} & {notes[1]}"
    if len(notes) == 1:
        return f"{primary_name} · {notes[0]}"
    if secondary and secondary != primary:
        return f"{primary_name} with {family_display(secondary)}"
    return primary_name


def fit_clusters(
    df: pd.DataFrame, vectors: np.ndarray, requested_k: int | None = None
) -> tuple[pd.DataFrame, dict, list[dict]]:
    if requested_k is None:
        requested_k, k_scores = choose_k(vectors)
    else:
        k_scores = []

    model = KMeans(n_clusters=requested_k, n_init=20, random_state=RANDOM_STATE)
    labels = model.fit_predict(vectors).astype(int)
    df = df.copy()
    df["cluster_id"] = labels

    global_counts: Counter[str] = Counter()
    for notes in df["notes"]:
        global_counts.update(set(notes))

    clusters: list[dict] = []
    for cluster_id in range(requested_k):
        mask = labels == cluster_id
        subset = df.loc[mask]
        mean_weights = {
            slug: float(subset[f"fam_{slug}"].mean()) for slug in FAMILY_SLUGS
        }
        ordered = sorted(mean_weights.items(), key=lambda item: item[1], reverse=True)
        primary, secondary = ordered[0][0], ordered[1][0]
        notes = _cluster_note_profile(df, labels, cluster_id, global_counts)
        name = _cluster_name(notes, primary, secondary)
        family = FAMILY_BY_SLUG[primary]
        centroid = model.cluster_centers_[cluster_id].astype(np.float32)
        description = (
            f"A {family_display(primary).lower()}-led cluster with "
            f"{family_display(secondary).lower()} undertones. "
            f"Built around {', '.join(notes) if notes else 'a balanced accord'}."
        )
        clusters.append(
            {
                "id": cluster_id,
                "name": name,
                "description": description,
                "topNotes": notes,
                "primaryFamily": family_display(primary),
                "secondaryFamily": family_display(secondary),
                "color": family.color,
                "size": int(mask.sum()),
                "meanWeights": {k: round(v, 4) for k, v in ordered if v > 0.01},
                "centroid": centroid.tolist(),
            }
        )

    name_by_id = {cluster["id"]: cluster["name"] for cluster in clusters}
    df["cluster_name"] = df["cluster_id"].map(name_by_id)

    meta = {
        "k": requested_k,
        "k_selection": k_scores,
        "silhouette": round(
            float(silhouette_score(vectors, labels, metric="cosine")), 4
        )
        if len(set(labels)) > 1
        else None,
        "davies_bouldin": round(float(davies_bouldin_score(vectors, labels)), 4),
        "sizes": {int(k): int(v) for k, v in zip(*np.unique(labels, return_counts=True))},
        "clusters": clusters,
    }
    joblib.dump(model, ARTIFACTS / "kmeans.joblib")
    (ARTIFACTS / "cluster_meta.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return df, meta, clusters
