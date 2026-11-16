"""Clean the Scento catalogue into a stable, typed dataset."""

from __future__ import annotations

import json
import re
from collections import Counter
from typing import Any

import pandas as pd

from .config import (
    CATALOGUE_JSON,
    HOUSES_CSV,
    PERFUMES_CSV,
    PERFUMES_PARQUET,
    QUALITY_JSON,
    ensure_dirs,
)
from .families import (
    FAMILIES,
    FAMILY_BY_NAME,
    FAMILY_SLUGS,
    family_display,
    normalize_note,
    note_family_weights,
    perfume_family_weights,
)

CONCENTRATION_LABELS = {
    "eau-de-parfum": "Eau de Parfum",
    "eau-de-toilette": "Eau de Toilette",
    "extrait": "Extrait de Parfum",
    "parfum": "Parfum",
    "eau-de-cologne": "Eau de Cologne",
    "elixir": "Elixir",
}

# Curated exceptions; house type is the fallback.
LUXURY_HOUSES = {
    "amouage",
    "clive-christian",
    "creed",
    "tom-ford",
    "xerjoff",
    "roja-parfums",
    "parfums-de-marly",
    "initio-parfums-prives",
    "kilian",
    "by-kilian",
    "maison-francis-kurkdjian",
    "byredo",
    "le-labo",
    "frederic-malle",
    "memo-paris",
    "mancera",
    "montale",
    "penhaligons",
    "boadicea-the-victorious",
    "bond-no-9",
    "carner-barcelona",
    "ex-nihilo",
    "fragrance-du-bois",
    "jovoy",
    "maison-crivelli",
    "matiere-premiere",
    "tiziana-terenzi",
}
PREMIUM_HOUSES = {
    "acqua-di-parma",
    "guerlain",
    "diptyque",
    "atelier-cologne",
    "hermes",
    "chanel",
    "dior",
    "givenchy",
    "ysl",
    "lancome",
    "valentino",
    "armani",
    "giorgio-armani",
    "prada",
    "versace",
    "burberry",
}
ACCESSIBLE_HOUSES = {
    "lattafa",
    "armaf",
    "al-haramain",
    "afnan",
    "arabian-oud",
    "khadlaj",
    "french-avenue",
    "fugazzi",
    "maison-noir",
}

HOUSE_TYPE_TIER = {
    "arabian": 1,
    "designer": 2,
    "artisan": 2,
    "niche": 3,
    "heritage": 3,
}

MALE_RE = re.compile(r"\b(pour homme|for men|men's|homme|masculine|gentleman)\b", re.IGNORECASE)
FEMALE_RE = re.compile(r"\b(pour femme|for women|women's|femme|feminine|lady|ladies)\b", re.IGNORECASE)


def split_list(value: Any) -> list[str]:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return []
    seen: set[str] = set()
    out: list[str] = []
    for part in str(value).split(";"):
        item = part.strip()
        if not item:
            continue
        key = normalize_note(item)
        if key and key not in seen:
            seen.add(key)
            out.append(item)
    return out


def infer_gender(name: str, description: str) -> str:
    text = f"{name} {description}"
    male = bool(MALE_RE.search(text))
    female = bool(FEMALE_RE.search(text))
    if male and not female:
        return "men"
    if female and not male:
        return "women"
    return "unisex"


def price_tier_for(house_id: str, house_type: str | None) -> tuple[int, str]:
    key = str(house_id).strip().lower()
    if key in LUXURY_HOUSES:
        return 4, "curated"
    if key in ACCESSIBLE_HOUSES:
        return 1, "curated"
    if key in PREMIUM_HOUSES:
        return 3, "curated"
    return HOUSE_TYPE_TIER.get(str(house_type).strip().lower(), 2), "house_type"


def load_houses() -> pd.DataFrame:
    houses = pd.read_csv(HOUSES_CSV)
    houses["id"] = houses["id"].astype(str).str.strip()
    return houses


def build_clean_dataset(write: bool = True) -> pd.DataFrame:
    ensure_dirs()
    if not PERFUMES_CSV.exists():
        raise FileNotFoundError(
            f"Missing {PERFUMES_CSV}. Run scripts/download_data.sh first."
        )

    raw = pd.read_csv(PERFUMES_CSV, encoding="utf-8")
    houses = load_houses()
    house_type = dict(zip(houses["id"], houses["type"], strict=False))

    rows: list[dict[str, Any]] = []
    for record in raw.to_dict(orient="records"):
        top = split_list(record.get("top_notes"))
        heart = split_list(record.get("heart_notes"))
        base = split_list(record.get("base_notes"))
        all_notes = split_list(record.get("notes"))
        if not (top or heart or base):
            top = all_notes

        weights = perfume_family_weights(top, heart, base, all_notes)
        family_name = str(record.get("family") or "").strip()
        family = FAMILY_BY_NAME.get(family_name)
        image_key = family.slug if family else "wood_root"
        secondary = record.get("secondary_family")
        secondary_name = str(secondary).strip() if secondary and not pd.isna(secondary) else None

        house_id = str(record.get("house_id") or "").strip()
        tier, tier_source = price_tier_for(house_id, house_type.get(house_id))

        description = str(record.get("description") or "").strip()
        name = str(record.get("name") or "").strip()
        year = record.get("year")
        popularity = record.get("popularity_rank")

        row: dict[str, Any] = {
            "id": str(record.get("id") or "").strip(),
            "name": name,
            "house": str(record.get("house") or "").strip(),
            "house_id": house_id,
            "year": int(year) if pd.notna(year) else None,
            "perfumers": split_list(record.get("perfumers")),
            "concentration": CONCENTRATION_LABELS.get(
                str(record.get("concentration") or "").strip(), "Unknown"
            ),
            "family": family_name or "Unknown",
            "secondary_family": secondary_name,
            "character": split_list(record.get("character")),
            "seasons": split_list(record.get("seasons")),
            "times_of_day": split_list(record.get("times_of_day")),
            "top_notes": top,
            "heart_notes": heart,
            "base_notes": base,
            "notes": all_notes,
            "description": description,
            "popularity_rank": int(popularity) if pd.notna(popularity) else None,
            "price_tier": tier,
            "price_tier_source": tier_source,
            "gender": infer_gender(name, description),
            "image_key": image_key,
            "url": str(record.get("url") or "").strip(),
            "family_weights": weights,
        }
        for slug in FAMILY_SLUGS:
            row[f"fam_{slug}"] = float(weights.get(slug, 0.0))
        rows.append(row)

    df = pd.DataFrame(rows)
    df = df[df["id"].ne("") & df["name"].ne("")].copy()
    df = df.drop_duplicates(subset=["id"], keep="first")
    df = df.drop_duplicates(subset=["name", "house"], keep="first").reset_index(drop=True)

    if write:
        # Dict columns are not supported by parquet; the fam_* columns hold the
        # same information in a stable, typed form.
        df.drop(columns=["family_weights"]).to_parquet(PERFUMES_PARQUET, index=False)
        write_catalogue(df)
        write_quality_report(df, raw)
    return df


def perfume_to_catalogue(row: pd.Series) -> dict[str, Any]:
    weights = row["family_weights"] if isinstance(row["family_weights"], dict) else {}
    return {
        "id": row["id"],
        "name": row["name"],
        "house": row["house"],
        "year": row["year"] if pd.notna(row["year"]) else None,
        "concentration": row["concentration"],
        "family": row["family"],
        "secondaryFamily": row["secondary_family"],
        "character": list(row["character"]),
        "seasons": list(row["seasons"]),
        "times": list(row["times_of_day"]),
        "topNotes": list(row["top_notes"]),
        "heartNotes": list(row["heart_notes"]),
        "baseNotes": list(row["base_notes"]),
        "notes": list(row["notes"]),
        "description": row["description"],
        "popularityRank": row["popularity_rank"] if pd.notna(row["popularity_rank"]) else None,
        "priceTier": int(row["price_tier"]),
        "priceTierSource": row["price_tier_source"],
        "gender": row["gender"],
        "imageKey": row["image_key"],
        "familyWeights": {k: round(float(v), 4) for k, v in weights.items()},
        "url": row["url"],
        "clusterId": None,
        "clusterName": None,
        "similarIds": [],
    }


def write_catalogue(df: pd.DataFrame) -> None:
    payload = {
        "generatedAt": pd.Timestamp.now(tz="UTC").isoformat(),
        "source": "Scento Perfume Database (CC BY 4.0)",
        "attribution": "Scento - https://www.scento.com/perfume-database",
        "families": [
            {
                "name": f.name,
                "slug": f.slug,
                "color": f.color,
                "gradientStart": f.gradient_start,
                "gradientEnd": f.gradient_end,
                "imageKey": f.image_key,
                "description": f.description,
            }
            for f in FAMILIES
        ],
        "priceTiers": [
            {"tier": 1, "label": "Accessible", "note": "Estimated, not retail pricing"},
            {"tier": 2, "label": "Designer", "note": "Estimated, not retail pricing"},
            {"tier": 3, "label": "Premium", "note": "Estimated, not retail pricing"},
            {"tier": 4, "label": "Luxury", "note": "Estimated, not retail pricing"},
        ],
        "clusters": [],
        "perfumes": [perfume_to_catalogue(row) for _, row in df.iterrows()],
    }
    CATALOGUE_JSON.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )


def write_quality_report(df: pd.DataFrame, raw: pd.DataFrame) -> None:
    note_counter: Counter[str] = Counter()
    mapped_counter: Counter[str] = Counter()
    for notes in df["notes"]:
        for note in notes:
            note_counter[note] += 1
            if note_family_weights(note):
                mapped_counter[note] += 1
    total_note_uses = sum(note_counter.values())
    mapped_uses = sum(mapped_counter.values())
    unmapped = [(n, c) for n, c in note_counter.most_common() if n not in mapped_counter]

    report = {
        "source_rows": len(raw),
        "clean_rows": len(df),
        "duplicate_ids_removed": int(len(raw) - raw["id"].nunique()),
        "unique_houses": int(df["house"].nunique()),
        "unique_notes": len(note_counter),
        "note_use_coverage": round(mapped_uses / max(1, total_note_uses), 4),
        "unmapped_note_uses": round(1 - mapped_uses / max(1, total_note_uses), 4),
        "top_unmapped_notes": unmapped[:30],
        "missing": {
            col: round(float(df[col].isna().mean()), 4)
            for col in ["year", "popularity_rank", "secondary_family"]
        },
        "family_distribution": df["family"].value_counts().to_dict(),
        "season_distribution": Counter(
            season for seasons in df["seasons"] for season in seasons
        ),
        "price_tier_distribution": df["price_tier"].value_counts().sort_index().to_dict(),
        "gender_distribution": df["gender"].value_counts().to_dict(),
        "empty_family_weights": int((df["family_weights"].map(len) == 0).sum()),
    }
    QUALITY_JSON.write_text(json.dumps(report, indent=2), encoding="utf-8")


def family_for_name(name: str) -> str:
    family = FAMILY_BY_NAME.get(name)
    return family.slug if family else "wood_root"


def display_family(slug: str) -> str:
    return family_display(slug)


if __name__ == "__main__":
    data = build_clean_dataset()
    print(f"Cleaned {len(data)} perfumes -> {PERFUMES_PARQUET}")
