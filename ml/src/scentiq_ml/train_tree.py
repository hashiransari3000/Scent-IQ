"""Train and evaluate the decision-tree enjoyment classifier."""

from __future__ import annotations

import json
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.tree import DecisionTreeClassifier

from .config import ARTIFACTS, ensure_dirs
from .pairwise import feature_names

META_COLUMNS = {"user_id", "perfume_id", "archetype", "liked", "sim_score"}


def _ndcg_at_k(labels: np.ndarray, scores: np.ndarray, k: int) -> float:
    order = np.argsort(-scores)[:k]
    gains = labels[order] / np.log2(np.arange(2, len(order) + 2))
    ideal_order = np.sort(labels)[::-1][:k]
    ideal = ideal_order / np.log2(np.arange(2, len(ideal_order) + 2))
    return float(gains.sum() / ideal.sum()) if ideal.sum() else 0.0


def _per_user_metrics(
    frame: pd.DataFrame, score_column: str, k: int = 10
) -> dict[str, float]:
    precisions: list[float] = []
    recalls: list[float] = []
    ndcgs: list[float] = []
    for _, group in frame.groupby("user_id"):
        labels = group["liked"].to_numpy()
        scores = group[score_column].to_numpy()
        order = np.argsort(-scores)[:k]
        top = labels[order]
        precisions.append(float(top.mean()))
        recalls.append(float(top.sum() / max(1, labels.sum())))
        ndcgs.append(_ndcg_at_k(labels, scores, k))
    return {
        f"precision_at_{k}": float(np.mean(precisions)),
        f"recall_at_{k}": float(np.mean(recalls)),
        f"ndcg_at_{k}": float(np.mean(ndcgs)),
    }


def _export_tree(tree: DecisionTreeClassifier, names: list[str]) -> dict[str, Any]:
    estimator = tree.tree_

    def node(index: int) -> dict[str, Any]:
        if estimator.children_left[index] == estimator.children_right[index]:
            values = estimator.value[index][0]
            total = float(values.sum())
            return {
                "leaf": True,
                "samples": int(estimator.n_node_samples[index]),
                "enjoyment_probability": round(float(values[1] / total), 4) if total else 0.0,
            }
        feature = names[estimator.feature[index]]
        threshold = float(estimator.threshold[index])
        return {
            "leaf": False,
            "feature": feature,
            "threshold": round(threshold, 5),
            "condition": f"{feature} <= {threshold:.4f}",
            "samples": int(estimator.n_node_samples[index]),
            "left": node(int(estimator.children_left[index])),
            "right": node(int(estimator.children_right[index])),
        }

    return node(0)


def train_tree(
    pairs: pd.DataFrame,
    k: int,
    *,
    test_size: float = 0.25,
    max_depth: int = 6,
    min_samples_leaf: int = 40,
    seed: int = 42,
) -> dict[str, Any]:
    ensure_dirs()
    names = feature_names(k)
    missing = [name for name in names if name not in pairs.columns]
    if missing:
        raise ValueError(f"Training pairs are missing features: {missing}")
    if "sim_score" in names:
        raise ValueError("sim_score is a label source, not a feature")

    X = pairs[names].to_numpy(dtype=float)
    y = pairs["liked"].to_numpy(dtype=int)
    groups = pairs["user_id"].to_numpy()

    splitter = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=seed)
    train_idx, test_idx = next(splitter.split(X, y, groups))
    train_users = set(groups[train_idx])
    test_users = set(groups[test_idx])
    overlap = train_users & test_users
    if overlap:
        raise RuntimeError(f"User leakage between splits: {sorted(overlap)[:3]}")

    tree = DecisionTreeClassifier(
        criterion="gini",
        max_depth=max_depth,
        min_samples_leaf=min_samples_leaf,
        class_weight="balanced",
        random_state=seed,
    )
    tree.fit(X[train_idx], y[train_idx])

    probabilities = tree.predict_proba(X[test_idx])[:, 1]
    predictions = (probabilities >= 0.5).astype(int)
    test_frame = pairs.iloc[test_idx].copy()
    test_frame["tree_probability"] = probabilities

    metrics: dict[str, Any] = {
        "model": "DecisionTreeClassifier",
        "k": k,
        "features": names,
        "parameters": {
            "max_depth": max_depth,
            "min_samples_leaf": min_samples_leaf,
            "class_weight": "balanced",
            "test_size": test_size,
        },
        "rows": {
            "total": len(pairs),
            "train": len(train_idx),
            "test": len(test_idx),
        },
        "users": {
            "total": len(set(groups)),
            "train": len(train_users),
            "test": len(test_users),
            "overlap": 0,
        },
        "positive_rate": round(float(y.mean()), 4),
        "classification": {
            "accuracy": round(float(accuracy_score(y[test_idx], predictions)), 4),
            "balanced_accuracy": round(
                float(balanced_accuracy_score(y[test_idx], predictions)), 4
            ),
            "precision": round(float(precision_score(y[test_idx], predictions, zero_division=0)), 4),
            "recall": round(float(recall_score(y[test_idx], predictions, zero_division=0)), 4),
            "f1": round(float(f1_score(y[test_idx], predictions, zero_division=0)), 4),
            "roc_auc": round(float(roc_auc_score(y[test_idx], probabilities)), 4),
            "confusion_matrix": confusion_matrix(y[test_idx], predictions).tolist(),
        },
        "ranking": _per_user_metrics(test_frame, "tree_probability", k=10),
        "baseline_ranking": _per_user_metrics(test_frame, "family_cosine", k=10),
        "tree": {
            "depth": int(tree.get_depth()),
            "leaves": int(tree.get_n_leaves()),
            "nodes": int(tree.tree_.node_count),
        },
    }
    metrics["ranking"]["lift_over_family_baseline"] = round(
        metrics["ranking"]["precision_at_10"]
        / max(metrics["baseline_ranking"]["precision_at_10"], 1e-9),
        3,
    )

    importances = sorted(
        (
            {"feature": name, "importance": round(float(value), 5)}
            for name, value in zip(names, tree.feature_importances_, strict=True)
        ),
        key=lambda item: item["importance"],
        reverse=True,
    )
    metrics["top_features"] = importances[:12]

    (ARTIFACTS / "metrics.json").write_text(
        json.dumps(metrics, indent=2), encoding="utf-8"
    )
    (ARTIFACTS / "tree_rules.json").write_text(
        json.dumps(_export_tree(tree, names), indent=2), encoding="utf-8"
    )
    (ARTIFACTS / "feature_importance.json").write_text(
        json.dumps(importances, indent=2), encoding="utf-8"
    )
    joblib.dump({"model": tree, "features": names, "k": k}, ARTIFACTS / "tree.joblib")
    return metrics


def load_pairs() -> pd.DataFrame:
    path = ARTIFACTS / "training_pairs.parquet"
    if not path.exists():
        raise FileNotFoundError(
            f"Missing {path}. Run the pipeline first to simulate training users."
        )
    return pd.read_parquet(path)


if __name__ == "__main__":
    from .config import CLUSTER_META_JSON

    meta = json.loads(CLUSTER_META_JSON.read_text(encoding="utf-8"))
    result = train_tree(load_pairs(), int(meta["k"]))
    print(json.dumps(result["classification"], indent=2))
    print(json.dumps(result["ranking"], indent=2))
