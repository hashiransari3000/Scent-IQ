"""Scent family metadata and note -> family mapping.

The 14 family names come from the Scento dataset. The mapping below is our own
interpretable taxonomy: every note can contribute to up to two families, with
weights, so a note such as "orange blossom" can be both white floral and citrus.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class ScentFamily:
    name: str
    slug: str
    color: str
    gradient_start: str
    gradient_end: str
    image_key: str
    description: str


FAMILIES: tuple[ScentFamily, ...] = (
    ScentFamily(
        "Wood & Root",
        "wood_root",
        "#8A6748",
        "#2B1D14",
        "#8A6748",
        "wood_root",
        "Cedar, sandalwood, vetiver and patchouli: grounded, dry and structural.",
    ),
    ScentFamily(
        "White Bloom",
        "white_bloom",
        "#E8DCCB",
        "#4A3B2C",
        "#E8DCCB",
        "white_bloom",
        "Jasmine, tuberose, gardenia and orange blossom: luminous white florals.",
    ),
    ScentFamily(
        "Petal Garden",
        "petal_garden",
        "#C27C88",
        "#3A1F26",
        "#C27C88",
        "petal_garden",
        "Rose, peony, iris and violet: the soft, romantic heart of perfumery.",
    ),
    ScentFamily(
        "Green Leaf",
        "green_leaf",
        "#7D8A64",
        "#1C2417",
        "#7D8A64",
        "green_leaf",
        "Galbanum, violet leaf, moss and herbs: cut stems and cool shade.",
    ),
    ScentFamily(
        "Velvet Sweet",
        "velvet_sweet",
        "#D2A24C",
        "#3A2413",
        "#D2A24C",
        "velvet_sweet",
        "Vanilla, tonka, caramel and cocoa: plush, edible warmth.",
    ),
    ScentFamily(
        "Sunlit Citrus",
        "sunlit_citrus",
        "#E7BE52",
        "#4A3512",
        "#E7BE52",
        "sunlit_citrus",
        "Bergamot, lemon, mandarin and neroli: bright, clean and immediately alive.",
    ),
    ScentFamily(
        "Spice Route",
        "spice_route",
        "#C47A4B",
        "#3B1D10",
        "#C47A4B",
        "spice_route",
        "Pepper, cardamom, cinnamon and saffron: heat, texture and motion.",
    ),
    ScentFamily(
        "Orchard Fruit",
        "orchard_fruit",
        "#D38B72",
        "#3D1F18",
        "#D38B72",
        "orchard_fruit",
        "Pear, peach, plum and berries: juicy, ripe and playful.",
    ),
    ScentFamily(
        "Amber & Resin",
        "amber_resin",
        "#B9833F",
        "#3A2410",
        "#B9833F",
        "amber_resin",
        "Labdanum, benzoin, myrrh and incense: golden, balmy depth.",
    ),
    ScentFamily(
        "Powder Veil",
        "powder_veil",
        "#DCC7C3",
        "#3A2C2C",
        "#DCC7C3",
        "powder_veil",
        "Iris, heliotrope and soft musk: a hazy, skin-close finish.",
    ),
    ScentFamily(
        "Skin Musk",
        "skin_musk",
        "#CDBBA1",
        "#332A21",
        "#CDBBA1",
        "skin_musk",
        "Musk, ambrette and cashmeran: warm skin, clean laundry, quiet intimacy.",
    ),
    ScentFamily(
        "Smoke & Leather",
        "smoke_leather",
        "#6D5A50",
        "#1D1715",
        "#6D5A50",
        "smoke_leather",
        "Birch, tobacco, suede and incense smoke: dark, tailored and animalic.",
    ),
    ScentFamily(
        "Salt & Mineral",
        "salt_mineral",
        "#87A3AE",
        "#1B262B",
        "#87A3AE",
        "salt_mineral",
        "Sea air, salt, driftwood and mineral accord: open, weightless freshness.",
    ),
    ScentFamily(
        "Oud Court",
        "oud_court",
        "#61402F",
        "#1A0F0B",
        "#61402F",
        "oud_court",
        "Oud, agarwood and cypriol: resinous, regal and unmistakably deep.",
    ),
)

FAMILY_BY_SLUG = {f.slug: f for f in FAMILIES}
FAMILY_BY_NAME = {f.name: f for f in FAMILIES}
FAMILY_SLUGS: tuple[str, ...] = tuple(f.slug for f in FAMILIES)
FAMILY_NAMES: tuple[str, ...] = tuple(f.name for f in FAMILIES)


def normalize_note(note: str) -> str:
    """Lowercase and collapse separators so variants match."""

    value = note.strip().lower().replace("&", " and ")
    value = value.replace("é", "e").replace("è", "e").replace("ê", "e")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


# Exact overrides take priority. Weights are relative within the note.
NOTE_OVERRIDES: dict[str, tuple[tuple[str, float], ...]] = {
    "orange blossom": (("white_bloom", 1.0), ("sunlit_citrus", 0.45)),
    "neroli": (("white_bloom", 0.9), ("sunlit_citrus", 0.6)),
    "bergamot": (("sunlit_citrus", 1.0), ("green_leaf", 0.2)),
    "lemon": (("sunlit_citrus", 1.0),),
    "lime": (("sunlit_citrus", 1.0),),
    "mandarin": (("sunlit_citrus", 1.0),),
    "grapefruit": (("sunlit_citrus", 1.0),),
    "petitgrain": (("sunlit_citrus", 0.8), ("green_leaf", 0.5)),
    "rose": (("petal_garden", 1.0), ("powder_veil", 0.2)),
    "rosewood": (("wood_root", 1.0),),
    "jasmine": (("white_bloom", 1.0), ("petal_garden", 0.25)),
    "jasmine sambac": (("white_bloom", 1.0),),
    "tuberose": (("white_bloom", 1.0),),
    "gardenia": (("white_bloom", 1.0),),
    "ylang ylang": (("white_bloom", 1.0), ("orchard_fruit", 0.2)),
    "lily of the valley": (("white_bloom", 0.9), ("green_leaf", 0.4)),
    "violet": (("petal_garden", 0.9), ("powder_veil", 0.6)),
    "iris": (("powder_veil", 1.0), ("petal_garden", 0.4)),
    "orris": (("powder_veil", 1.0), ("petal_garden", 0.4)),
    "heliotrope": (("powder_veil", 1.0), ("velvet_sweet", 0.4)),
    "musk": (("skin_musk", 1.0),),
    "ambrette": (("skin_musk", 0.8), ("amber_resin", 0.5)),
    "cashmeran": (("skin_musk", 0.7), ("wood_root", 0.7)),
    "cashmere wood": (("wood_root", 0.9), ("skin_musk", 0.5)),
    "ambergris": (("amber_resin", 0.9), ("salt_mineral", 0.5)),
    "ambroxan": (("amber_resin", 0.8), ("skin_musk", 0.5)),
    "cetalox": (("amber_resin", 0.8), ("skin_musk", 0.5)),
    "oud": (("oud_court", 1.0), ("wood_root", 0.45)),
    "agarwood": (("oud_court", 1.0), ("wood_root", 0.45)),
    "cypriol": (("oud_court", 0.9), ("wood_root", 0.6)),
    "sandalwood": (("wood_root", 1.0), ("powder_veil", 0.2)),
    "cedarwood": (("wood_root", 1.0),),
    "vetiver": (("wood_root", 0.8), ("green_leaf", 0.6)),
    "patchouli": (("wood_root", 0.8), ("amber_resin", 0.6)),
    "oakmoss": (("green_leaf", 0.9), ("wood_root", 0.5)),
    "treemoss": (("green_leaf", 0.9), ("wood_root", 0.5)),
    "leather": (("smoke_leather", 1.0),),
    "suede": (("smoke_leather", 1.0),),
    "tobacco": (("smoke_leather", 0.9), ("velvet_sweet", 0.5)),
    "incense": (("amber_resin", 0.9), ("smoke_leather", 0.4)),
    "frankincense": (("amber_resin", 0.9), ("smoke_leather", 0.3)),
    "myrrh": (("amber_resin", 1.0),),
    "benzoin": (("amber_resin", 0.9), ("velvet_sweet", 0.4)),
    "labdanum": (("amber_resin", 0.9), ("smoke_leather", 0.3)),
    "tonka bean": (("velvet_sweet", 1.0), ("amber_resin", 0.4)),
    "vanilla": (("velvet_sweet", 1.0), ("amber_resin", 0.3)),
    "coumarin": (("velvet_sweet", 1.0),),
    "honey": (("velvet_sweet", 0.9), ("amber_resin", 0.4)),
    "beeswax": (("velvet_sweet", 0.8), ("amber_resin", 0.4)),
    "chocolate": (("velvet_sweet", 1.0),),
    "coffee": (("velvet_sweet", 1.0), ("smoke_leather", 0.2)),
    "caramel": (("velvet_sweet", 1.0),),
    "coconut": (("velvet_sweet", 0.9), ("salt_mineral", 0.2)),
    "almond": (("velvet_sweet", 0.8), ("powder_veil", 0.4)),
    "saffron": (("spice_route", 1.0),),
    "pepper": (("spice_route", 1.0),),
    "pink pepper": (("spice_route", 1.0),),
    "cinnamon": (("spice_route", 0.9), ("amber_resin", 0.4)),
    "clove": (("spice_route", 0.9), ("amber_resin", 0.3)),
    "cardamom": (("spice_route", 1.0),),
    "nutmeg": (("spice_route", 0.9), ("amber_resin", 0.3)),
    "ginger": (("spice_route", 1.0),),
    "salt": (("salt_mineral", 1.0),),
    "salty vanilla": (("salt_mineral", 0.6), ("velvet_sweet", 1.0)),
    "sea notes": (("salt_mineral", 1.0),),
    "aquatic accord": (("salt_mineral", 1.0),),
    "mineral accord": (("salt_mineral", 1.0),),
    "calone": (("salt_mineral", 1.0),),
    "algae": (("salt_mineral", 0.9), ("green_leaf", 0.3)),
    "driftwood": (("salt_mineral", 0.6), ("wood_root", 0.8)),
    "fig": (("orchard_fruit", 0.8), ("green_leaf", 0.5)),
    "fig wood": (("wood_root", 0.9), ("green_leaf", 0.4)),
    "apple": (("orchard_fruit", 1.0), ("green_leaf", 0.2)),
    "pear": (("orchard_fruit", 1.0), ("green_leaf", 0.2)),
    "peach": (("orchard_fruit", 1.0),),
    "plum": (("orchard_fruit", 1.0),),
    "cherry": (("orchard_fruit", 0.9), ("velvet_sweet", 0.3)),
    "blackcurrant": (("orchard_fruit", 0.9), ("green_leaf", 0.4)),
    "pineapple": (("orchard_fruit", 1.0),),
    "melon": (("orchard_fruit", 0.8), ("salt_mineral", 0.4)),
    "cucumber": (("salt_mineral", 0.7), ("green_leaf", 0.6)),
    "water lily": (("salt_mineral", 0.8), ("white_bloom", 0.7)),
    "lotus": (("salt_mineral", 0.6), ("petal_garden", 0.7)),
    "green tea": (("green_leaf", 1.0),),
    "tea": (("green_leaf", 0.8), ("wood_root", 0.2)),
    "hay": (("green_leaf", 0.8), ("velvet_sweet", 0.3)),
    "tobacco flower": (("white_bloom", 0.7), ("smoke_leather", 0.4)),
    "powdery notes": (("powder_veil", 1.0),),
    "aldehydes": (("powder_veil", 0.7), ("skin_musk", 0.5)),
    "white fur": (("skin_musk", 0.8), ("powder_veil", 0.5)),
    "fresh cotton": (("skin_musk", 0.8), ("powder_veil", 0.5)),
    "white linen": (("skin_musk", 0.7), ("powder_veil", 0.6)),
    "soap bubbles": (("skin_musk", 0.7), ("powder_veil", 0.6)),
    "floral notes": (("white_bloom", 0.6), ("petal_garden", 0.6)),
    "white flowers": (("white_bloom", 1.0), ("petal_garden", 0.3)),
    "woody notes": (("wood_root", 1.0),),
    "spicy notes": (("spice_route", 1.0),),
    "gourmand accord": (("velvet_sweet", 1.0),),
    "resins": (("amber_resin", 1.0),),
    "animalic notes": (("smoke_leather", 0.7), ("skin_musk", 0.6)),
    "lactones": (("velvet_sweet", 0.8), ("orchard_fruit", 0.4)),
    "candied fruits": (("velvet_sweet", 0.6), ("orchard_fruit", 0.8)),
    "candied citrus": (("sunlit_citrus", 0.9), ("velvet_sweet", 0.4)),
    "dried fruits": (("orchard_fruit", 0.8), ("velvet_sweet", 0.5)),
    "dates": (("orchard_fruit", 0.8), ("velvet_sweet", 0.6)),
    "immortelle": (("amber_resin", 0.7), ("velvet_sweet", 0.5)),
    "maple": (("velvet_sweet", 1.0), ("wood_root", 0.3)),
    "licorice": (("velvet_sweet", 0.8), ("spice_route", 0.4)),
    "anise": (("spice_route", 0.9), ("velvet_sweet", 0.4)),
    "mastic": (("amber_resin", 0.7), ("green_leaf", 0.4)),
    "palo santo": (("wood_root", 0.7), ("amber_resin", 0.6)),
    "amyris": (("wood_root", 0.8), ("amber_resin", 0.5)),
    "guaiac wood": (("wood_root", 0.9), ("smoke_leather", 0.5)),
    "birch": (("wood_root", 0.7), ("smoke_leather", 0.5)),
    "cade": (("smoke_leather", 0.9), ("wood_root", 0.5)),
    "gunpowder": (("smoke_leather", 1.0),),
    "coal": (("smoke_leather", 1.0),),
    "embers": (("smoke_leather", 1.0),),
    "castoreum": (("smoke_leather", 0.8), ("skin_musk", 0.5)),
    "civet": (("smoke_leather", 0.8), ("skin_musk", 0.5)),
    "mate": (("green_leaf", 1.0),),
    "davana": (("orchard_fruit", 0.6), ("green_leaf", 0.6)),
    "marigold": (("petal_garden", 0.8), ("green_leaf", 0.5)),
    "african marigold": (("petal_garden", 0.8), ("green_leaf", 0.5)),
    "tarragon": (("green_leaf", 1.0),),
    "chantilly": (("velvet_sweet", 1.0),),
    "myrtle": (("green_leaf", 1.0),),
    "petalia": (("petal_garden", 1.0),),
    "broom": (("green_leaf", 0.7), ("white_bloom", 0.4)),
    "mahonial": (("white_bloom", 1.0),),
    "litsea": (("sunlit_citrus", 0.7), ("green_leaf", 0.5)),
    "olive tree": (("wood_root", 0.7), ("green_leaf", 0.5)),
    "amaretto": (("velvet_sweet", 1.0),),
    "sand": (("salt_mineral", 1.0),),
    "datura flower": (("white_bloom", 1.0),),
    "coco de mer": (("velvet_sweet", 0.8), ("salt_mineral", 0.3)),
    "santolina": (("green_leaf", 1.0),),
    "pittosporum": (("white_bloom", 1.0),),
    "calypsone": (("skin_musk", 1.0),),
    "cactus": (("green_leaf", 1.0),),
    "schinus molle": (("spice_route", 1.0),),
    "campanula": (("petal_garden", 1.0),),
    "creme brulee": (("velvet_sweet", 1.0),),
    "passion flower": (("white_bloom", 1.0),),
    "ultravanil": (("velvet_sweet", 1.0),),
    "buchu": (("green_leaf", 1.0),),
    "griotte syrup": (("orchard_fruit", 0.8), ("velvet_sweet", 0.5)),
    "flax flower": (("white_bloom", 1.0),),
    "copaiba balm": (("amber_resin", 1.0),),
    "transluzone": (("wood_root", 0.5), ("amber_resin", 0.5)),
}


# Ordered fallback rules. Specific families first; a note may match up to two.
FAMILY_RULES: tuple[tuple[str, str], ...] = (
    ("oud_court", r"\boud\b|agarwood|\bcypriol\b"),
    (
        "smoke_leather",
        r"leather|suede|smoke|tobacco|\bcade\b|castoreum|civet|animalic|gunpowder|\bcoal\b|embers|black ink",
    ),
    (
        "salt_mineral",
        r"\bsalt\b|salty|sea notes|marine|aquatic|calone|algae|seaweed|mineral|fresh wind|watery|water lily|lotus|cucumber|caviar",
    ),
    (
        "amber_resin",
        r"\bamber\b|ambergris|ambroxan|ambrette|cetalox|amberwood|amberketal|ambrocenide|ambrofix|ambermax|orcanox|thibetone|labdanum|benzoin|myrrh|frankincense|incense|opoponax|styrax|elemi|balsam|resins|cistus|immortelle",
    ),
    (
        "velvet_sweet",
        r"vanilla|tonka|coumarin|caramel|chocolate|cocoa|coffee|honey|praline|almond|coconut|marshmallow|\bmilk\b|sugar|toffee|maple|speculoos|ice cream|panna cotta|meringue|licorice|bubble gum|cotton candy|basmati|\brice\b|kulfi|turkish delight|\bdates\b|\brum\b|cognac|whisky|liqueur|liquor|champagne|\bwine\b|beeswax|hazelnut|chestnut|pistachio|macadamia|sesame|pumpkin|carrot|gingerbread|popcorn|cereal",
    ),
    (
        "spice_route",
        r"cinnamon|clove|cardamom|pepper|saffron|nutmeg|ginger|cumin|anise|turmeric|coriander|caraway|fenugreek|pimento|\bbay\b|curry|spice|spicy|oregano|laurel|absinthe|camphor",
    ),
    (
        "sunlit_citrus",
        r"bergamot|lemon|lime|orange|mandarin|tangerine|grapefruit|neroli|petitgrain|yuzu|cedrat|kumquat|citron|mandora|verbena|lemongrass|citrus",
    ),
    (
        "orchard_fruit",
        r"apple|pear|peach|apricot|plum|cherry|berry|berries|raspberry|strawberry|blackcurrant|currant|blackberry|blueberry|\bfig\b|pineapple|melon|mango|lychee|\bgrape\b|banana|passion fruit|passionfruit|guava|papaya|quince|persimmon|pomegranate|rhubarb|nectarine|fruit|tropical|water fruits|carambola|cloudberry|lingonberry|goji|maninka|naseberry|prickly pear",
    ),
    (
        "green_leaf",
        r"green|galbanum|violet leaf|tomato leaf|grass|hay|bamboo|ivy|fern|moss|lichen|\btea\b|basil|rosemary|sage|thyme|mint|verbena|angelica|artemisia|cannabis|clover|soil|mushroom|papyrus|juniper|cypress|pine|fir|beech|shiso|matcha|oolong|vegetal|aromatic",
    ),
    (
        "white_bloom",
        r"jasmine|tuberose|gardenia|orange blossom|neroli|ylang|gardenia|lily|magnolia|freesia|honeysuckle|champaca|tiare|frangipani|white flowers|muguet|linden|osmanthus|heliotrope|hedione|indole|night blooming|boronia|rangoon|silk tree|silk plant|queen of the night|amaryllis|hippeastrum",
    ),
    (
        "petal_garden",
        r"rose|peony|iris|violet|lilac|geranium|carnation|tulip|orchid|lotus|osmanthus|mimosa|chamomile|lavender|lavandin|daisy|daffodil|hyacinth|cyclamen|wisteria|bluebell|frangipani|hibiscus|poppy|sweet pea|mignonette|camellia|floral",
    ),
    (
        "powder_veil",
        r"powder|powdery|iris|orris|heliotrope|violet|mimosa|\brice powder\b|almond|soap|linen|cotton|white fur|silk|aldehydes|hawthorn|lilac",
    ),
    (
        "skin_musk",
        r"musk|muscone|muscenone|ambrette|ambrettolide|cashmeran|cashmere wood|sylkolide|white fur|skin|silk|soap|linen|fresh cotton|aldehydes",
    ),
    (
        "wood_root",
        r"wood|woodsy|cedar|sandal|vetiver|patchouli|oakmoss|treemoss|cypress|pine|fir|juniper|guaiac|birch|teak|rosewood|mahogany|ebony|satinwood|kingwood|palo santo|amyris|papyrus|clearwood|akigalawood|georgywood|lorenox|sycamore|driftwood|cashmeran|cashmere wood|oud|agarwood|cypriol",
    ),
)

_RULE_PATTERNS = tuple((slug, re.compile(pattern)) for slug, pattern in FAMILY_RULES)


def note_family_weights(note: str) -> dict[str, float]:
    """Return at most two family weights for a note."""

    key = normalize_note(note)
    if not key:
        return {}
    if key in NOTE_OVERRIDES:
        return {slug: weight for slug, weight in NOTE_OVERRIDES[key] if weight > 0}

    matches: list[tuple[str, float]] = []
    for slug, pattern in _RULE_PATTERNS:
        if pattern.search(key):
            matches.append((slug, 1.0 if not matches else 0.5))
            if len(matches) == 2:
                break
    return dict(matches)


def perfume_family_weights(
    top_notes: list[str],
    heart_notes: list[str],
    base_notes: list[str],
    all_notes: list[str] | None = None,
) -> dict[str, float]:
    """Aggregate note families with a pyramid weighting, normalized to 1."""

    scores = dict.fromkeys(FAMILY_SLUGS, 0.0)
    role_weights = (("top", 0.8, top_notes), ("heart", 1.0, heart_notes), ("base", 1.25, base_notes))
    for _role, role_weight, notes in role_weights:
        for note in notes:
            for slug, weight in note_family_weights(note).items():
                scores[slug] += role_weight * weight

    if not any(scores.values()) and all_notes:
        for note in all_notes:
            for slug, weight in note_family_weights(note).items():
                scores[slug] += weight

    total = sum(scores.values())
    if total <= 0:
        return {}
    return {slug: round(value / total, 6) for slug, value in sorted(scores.items()) if value > 0}


def family_display(slug: str) -> str:
    family = FAMILY_BY_SLUG.get(slug)
    return family.name if family else slug.replace("_", " ").title()
