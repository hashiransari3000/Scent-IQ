"""End-to-end offline pipeline: clean -> features -> clusters -> simulate -> tree."""

from __future__ import annotations

import argparse
import json

import numpy as np
import pandas as pd

from .clean import build_clean_dataset
from .cluster import fit_clusters
from .config import (
    CATALOGUE_JSON,
    CLUSTER_META_JSON,
    PERFUMES_PARQUET,
    SIMULATED_USERS_JSON,
    TRAINING_PAIRS_PARQUET,
    WEB_CATALOGUE_JSON,
    ensure_dirs,
)
from .families import FAMILY_BY_NAME
from .features import build_feature_space, similarity_map
from .simulate import generate_training_data
from .train_tree import train_tree


def merge_catalogue(clusters: list[dict], similar: dict[str, list[str]], coords: np.ndarray) -> None:
    payload = json.loads(CATALOGUE_JSON.read_text(encoding="utf-8"))
    ids = [str(perfume["id"]) for perfume in payload["perfumes"]]
    index_by_id = {perfume_id: index for index, perfume_id in enumerate(ids)}
    cluster_by_id = {}
    for cluster in clusters:
        cluster_by_id[int(cluster["id"])] = cluster

    for perfume in payload["perfumes"]:
        perfume_id = str(perfume["id"])
        index = index_by_id[perfume_id]
        perfume["clusterId"] = int(perfume["clusterId"]) if perfume.get("clusterId") is not None else None
        perfume["similarIds"] = similar.get(perfume_id, [])
        perfume["coordinates"] = [
            round(float(coords[index, 0]), 4),
            round(float(coords[index, 1]), 4),
        ]
        family = FAMILY_BY_NAME.get(str(perfume.get("family")))
        if family:
            perfume["familySlug"] = family.slug
            perfume["familyColor"] = family.color

    meta = json.loads(CLUSTER_META_JSON.read_text(encoding="utf-8"))
    payload["clusters"] = [
        {
            "id": cluster["id"],
            "name": cluster["name"],
            "description": cluster["description"],
            "topNotes": cluster["topNotes"],
            "primaryFamily": cluster["primaryFamily"],
            "secondaryFamily": cluster["secondaryFamily"],
            "color": cluster["color"],
            "size": cluster["size"],
            "meanWeights": cluster["meanWeights"],
        }
        for cluster in meta["clusters"]
    ]

    # Attach cluster ids/names to each perfume from the parquet-backed mapping.
    frame = pd.read_parquet(PERFUMES_PARQUET)
    cluster_lookup = {
        str(row["id"]): (int(row["cluster_id"]), str(row["cluster_name"]))
        for _, row in frame.iterrows()
    }
    for perfume in payload["perfumes"]:
        perfume_id = str(perfume["id"])
        cluster_id, cluster_name = cluster_lookup[perfume_id]
        perfume["clusterId"] = cluster_id
        perfume["clusterName"] = cluster_name
        cluster = cluster_by_id[cluster_id]
        perfume["clusterColor"] = cluster["color"]

    payload["generatedAt"] = pd.Timestamp.now(tz="UTC").isoformat()
    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    CATALOGUE_JSON.write_text(text, encoding="utf-8")
    WEB_CATALOGUE_JSON.write_text(text, encoding="utf-8")


def run(k: int | None = None, users_per_archetype: int = 30) -> dict:
    ensure_dirs()
    print("[1/6] Cleaning catalogue ...")
    df = build_clean_dataset(write=True)
    print(f"      {len(df)} perfumes, {df['house'].nunique()} houses")

    print("[2/6] Building TF-IDF/SVD feature space ...")
    vectors, coords, feature_meta = build_feature_space(df)
    print(f"      vectors={vectors.shape}, explained={feature_meta['explained_variance']:.3f}")

    print("[3/6] Fitting K-Means clusters ...")
    df, cluster_meta, clusters = fit_clusters(df, vectors, requested_k=k)
    print(f"      k={cluster_meta['k']}, silhouette={cluster_meta['silhouette']}")
    for cluster in clusters:
        print(f"      [{cluster['id']:>2}] {cluster['name']:<38} n={cluster['size']}")

    print("[4/6] Building similarity map ...")
    similar = similarity_map(vectors, df["id"].tolist())
    df.drop(columns=["family_weights"]).to_parquet(PERFUMES_PARQUET, index=False)

    print("[5/6] Simulating users and pairs ...")
    pairs, users = generate_training_data(
        df, cluster_meta["k"], users_per_archetype=users_per_archetype
    )
    pairs.to_parquet(TRAINING_PAIRS_PARQUET, index=False)
    SIMULATED_USERS_JSON.write_text(json.dumps(users, indent=2), encoding="utf-8")
    print(f"      {len(users)} users, {len(pairs)} labelled pairs, positive={pairs['liked'].mean():.2f}")

    print("[6/6] Training decision tree ...")
    metrics = train_tree(pairs, cluster_meta["k"])
    merge_catalogue(clusters, similar, coords)
    print(f"      accuracy={metrics['classification']['accuracy']}, "
          f"roc_auc={metrics['classification']['roc_auc']}, "
          f"P@10={metrics['ranking']['precision_at_10']} "
          f"(baseline {metrics['baseline_ranking']['precision_at_10']})")
    print(f"      catalogue -> {CATALOGUE_JSON} and {WEB_CATALOGUE_JSON}")
    return {"metrics": metrics, "clusters": cluster_meta, "features": feature_meta}


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the ScentIQ offline pipeline")
    parser.add_argument("--k", type=int, default=None, help="fixed cluster count")
    parser.add_argument("--users", type=int, default=30, help="simulated users per archetype")
    args = parser.parse_args()
    run(k=args.k, users_per_archetype=args.users)


if __name__ == "__main__":
    main()
