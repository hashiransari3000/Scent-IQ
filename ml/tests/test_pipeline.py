"""Contract tests for the offline artefacts and the online engine.

Run the pipeline before pytest:
    uv run python -m scentiq_ml.run_pipeline
    uv run pytest
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
import pytest

from scentiq_ml.config import (
    ARTIFACTS,
    CATALOGUE_JSON,
    CLUSTER_META_JSON,
    METRICS_JSON,
    PERFUMES_PARQUET,
    QUALITY_JSON,
    SIMULATED_USERS_JSON,
    TRAINING_PAIRS_PARQUET,
    VECTORS_NPZ,
)
from scentiq_ml.rank import RecommendationEngine


@pytest.fixture(scope="session")
def frame() -> pd.DataFrame:
    assert PERFUMES_PARQUET.exists(), "Run the pipeline first"
    return pd.read_parquet(PERFUMES_PARQUET)


@pytest.fixture(scope="session")
def engine() -> RecommendationEngine:
    return RecommendationEngine()


def test_quality_report() -> None:
    report = json.loads(QUALITY_JSON.read_text(encoding="utf-8"))
    assert report["clean_rows"] == 1478
    assert report["note_use_coverage"] >= 0.99
    assert report["unmapped_note_uses"] <= 0.01
    assert report["empty_family_weights"] == 0


def test_catalogue_alignment(frame: pd.DataFrame) -> None:
    catalogue = json.loads(CATALOGUE_JSON.read_text(encoding="utf-8"))
    assert len(catalogue["perfumes"]) == len(frame)
    assert catalogue["clusters"]
    for perfume in catalogue["perfumes"]:
        assert perfume["clusterId"] is not None
        assert perfume["clusterName"]
        assert len(perfume["coordinates"]) == 2
        assert len(perfume["similarIds"]) == 12
        assert perfume["id"] not in perfume["similarIds"]


def test_feature_space(frame: pd.DataFrame) -> None:
    vectors = np.load(VECTORS_NPZ, allow_pickle=False)
    matrix = vectors["vectors"]
    coords = vectors["coords"]
    assert matrix.shape[0] == len(frame)
    assert matrix.shape[1] == 32
    assert np.allclose(np.linalg.norm(matrix, axis=1), 1.0, atol=1e-4)
    assert np.abs(coords).max() <= 1.0 + 1e-6
    assert len(set(vectors["ids"].tolist())) == len(frame)


def test_cluster_contract(frame: pd.DataFrame) -> None:
    meta = json.loads(CLUSTER_META_JSON.read_text(encoding="utf-8"))
    assert meta["k"] >= 4
    assert len(meta["clusters"]) == meta["k"]
    names = [cluster["name"] for cluster in meta["clusters"]]
    assert len(names) == len(set(names))
    assert sum(cluster["size"] for cluster in meta["clusters"]) == len(frame)
    assert frame["cluster_id"].between(0, meta["k"] - 1).all()


def test_simulation_pairs_are_clean() -> None:
    pairs = pd.read_parquet(TRAINING_PAIRS_PARQUET)
    users = json.loads(SIMULATED_USERS_JSON.read_text(encoding="utf-8"))
    assert len(users) == 360
    assert 0.25 <= pairs["liked"].mean() <= 0.35
    assert "sim_score" in pairs.columns  # kept for audits, never passed to the tree
    assert "cluster_0" in pairs.columns
    assert pairs["user_id"].nunique() == len(users)

    by_user = pairs.groupby("user_id")["perfume_id"].apply(set).to_dict()
    for user in users[:80]:
        assert not set(user["history_ids"]) & by_user[user["user_id"]]


def test_tree_metrics() -> None:
    metrics = json.loads(METRICS_JSON.read_text(encoding="utf-8"))
    assert metrics["users"]["overlap"] == 0
    assert "sim_score" not in metrics["features"]
    assert "liked" not in metrics["features"]
    assert metrics["classification"]["accuracy"] >= 0.55
    assert metrics["classification"]["roc_auc"] >= 0.60
    assert metrics["ranking"]["precision_at_10"] > metrics["baseline_ranking"]["precision_at_10"]
    assert metrics["tree"]["depth"] <= 6


def test_recommendation_contract(engine: RecommendationEngine) -> None:
    liked = engine.ids[0]
    response = engine.recommend(
        {
            "loved_ids": [liked],
            "love_notes": ["rose", "oud"],
            "avoid_notes": ["vanilla"],
            "budget_tier": 3,
            "seasons": ["autumn"],
            "times": ["evening"],
            "limit": 8,
        }
    )
    items = response["items"]
    assert len(items) == 8
    assert liked not in {item["id"] for item in items}
    assert response["meta"]["considered"] > 1000
    for item in items:
        assert 1 <= item["match"] <= 99
        assert item["reasons"]
        assert item["clusterName"]
        assert set(item.keys()) >= {"topNotes", "heartNotes", "baseNotes", "breakdown"}


def test_hard_filters(engine: RecommendationEngine) -> None:
    response = engine.recommend(
        {
            "love_notes": ["bergamot"],
            "limit": 10,
            "filters": {
                "seasons": ["summer"],
                "budget_max": 2,
                "gender": "any",
                "strict": True,
            },
        }
    )
    assert response["items"]
    for item in response["items"]:
        assert "summer" in item["seasons"]
        assert item["priceTier"] <= 2


def test_explanation_and_conflict(engine: RecommendationEngine) -> None:
    row = engine.df.iloc[10]
    note = row["notes"][0]
    explanation = engine.explain(
        str(row["id"]),
        {"love_notes": [note], "avoid_notes": [note]},
    )
    assert explanation["id"] == str(row["id"])
    assert explanation["reasons"]
    assert explanation["conflicts"]


def test_model_info_is_serialisable(engine: RecommendationEngine) -> None:
    info = engine.model_info()
    json.dumps(info)
    assert info["clusters"]["k"] == engine.k
    assert info["catalogue"]["perfumes"] == 1478
    assert info["limitations"]
    assert (ARTIFACTS / "tree.joblib").exists()
