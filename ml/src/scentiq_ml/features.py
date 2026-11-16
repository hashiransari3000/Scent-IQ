"""Perfume feature extraction: TF-IDF over note families/notes -> SVD -> vectors."""

from __future__ import annotations

import json

import joblib
import numpy as np
import pandas as pd
from sklearn.decomposition import PCA, TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import Normalizer

from .config import ARTIFACTS, N_SVD_COMPONENTS, RANDOM_STATE
from .families import FAMILY_SLUGS, normalize_note


def build_documents(df: pd.DataFrame) -> list[str]:
    docs: list[str] = []
    for _, row in df.iterrows():
        tokens: list[str] = []
        for slug in FAMILY_SLUGS:
            weight = float(row.get(f"fam_{slug}", 0.0))
            if weight > 0:
                tokens.extend([f"fam:{slug}"] * max(1, round(weight * 24)))
        family = str(row.get("family") or "").strip()
        if family:
            tokens.append(f"family:{normalize_note(family).replace(' ', '_')}")
        secondary = row.get("secondary_family")
        if isinstance(secondary, str) and secondary.strip():
            tokens.append(f"family:{normalize_note(secondary).replace(' ', '_')}")
        for note in row.get("notes", []):
            key = normalize_note(note).replace(" ", "_")
            if key:
                tokens.append(f"note:{key}")
        docs.append(" ".join(tokens))
    return docs


def build_feature_space(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray, dict]:
    """Return normalized vectors and 2-D map coordinates."""

    docs = build_documents(df)
    vectorizer = TfidfVectorizer(
        token_pattern=r"\S+",
        lowercase=False,
        min_df=2,
        max_df=0.92,
        sublinear_tf=True,
    )
    tfidf = vectorizer.fit_transform(docs)
    n_components = min(N_SVD_COMPONENTS, tfidf.shape[1] - 1, tfidf.shape[0] - 1)
    svd = TruncatedSVD(n_components=n_components, random_state=RANDOM_STATE)
    reduced = svd.fit_transform(tfidf)
    vectors = Normalizer().fit_transform(reduced)
    coords = PCA(n_components=2, random_state=RANDOM_STATE).fit_transform(reduced)
    scale = float(np.abs(coords).max()) or 1.0
    coords = coords / scale

    meta = {
        "tfidf_features": int(tfidf.shape[1]),
        "svd_components": int(n_components),
        "explained_variance": round(float(svd.explained_variance_ratio_.sum()), 4),
        "documents": int(tfidf.shape[0]),
        "note_families": list(FAMILY_SLUGS),
    }
    joblib.dump(vectorizer, ARTIFACTS / "tfidf.joblib")
    joblib.dump(svd, ARTIFACTS / "svd.joblib")
    np.savez_compressed(
        ARTIFACTS / "vectors.npz",
        ids=df["id"].to_numpy(dtype=str),
        vectors=vectors.astype(np.float32),
        coords=coords.astype(np.float32),
    )
    (ARTIFACTS / "feature_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return vectors, coords, meta


def similarity_map(vectors: np.ndarray, ids: list[str], top_n: int = 12) -> dict[str, list[str]]:
    similarity = vectors @ vectors.T
    np.fill_diagonal(similarity, -1.0)
    result: dict[str, list[str]] = {}
    for index, perfume_id in enumerate(ids):
        order = np.argsort(similarity[index])[-top_n:][::-1]
        result[perfume_id] = [ids[i] for i in order if ids[i] != perfume_id]
    (ARTIFACTS / "similar.json").write_text(json.dumps(result), encoding="utf-8")
    return result
