"""Shared paths for the ScentIQ pipeline."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DATA_RAW = ROOT / "data" / "raw" / "scento"
DATA_PROCESSED = ROOT / "data" / "processed"
ARTIFACTS = ROOT / "ml" / "artifacts"
WEB_DATA = ROOT / "apps" / "web" / "src" / "data"

PERFUMES_CSV = DATA_RAW / "perfumes.csv"
HOUSES_CSV = DATA_RAW / "houses.csv"
MATERIALS_CSV = DATA_RAW / "materials.csv"

PERFUMES_PARQUET = DATA_PROCESSED / "perfumes.parquet"
CATALOGUE_JSON = DATA_PROCESSED / "catalogue.json"
QUALITY_JSON = DATA_PROCESSED / "quality_report.json"
WEB_CATALOGUE_JSON = WEB_DATA / "catalogue.json"

CLUSTER_META_JSON = ARTIFACTS / "cluster_meta.json"
FEATURE_META_JSON = ARTIFACTS / "feature_meta.json"
VECTORS_NPZ = ARTIFACTS / "vectors.npz"
SIMILAR_JSON = ARTIFACTS / "similar.json"
TREE_JOBLIB = ARTIFACTS / "tree.joblib"
METRICS_JSON = ARTIFACTS / "metrics.json"
TREE_RULES_JSON = ARTIFACTS / "tree_rules.json"
FEATURE_IMPORTANCE_JSON = ARTIFACTS / "feature_importance.json"
TRAINING_PAIRS_PARQUET = ARTIFACTS / "training_pairs.parquet"
SIMULATED_USERS_JSON = ARTIFACTS / "simulated_users.json"

RANDOM_STATE = 42
N_CLUSTERS = 10
N_SVD_COMPONENTS = 32


def ensure_dirs() -> None:
    for path in (DATA_PROCESSED, ARTIFACTS, WEB_DATA):
        path.mkdir(parents=True, exist_ok=True)
