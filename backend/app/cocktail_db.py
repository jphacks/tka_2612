"""お酒のデータの読み込み

- data/cocktails_source.json: 手で書く元データ（名前・別名・説明文・材料）
- data/cocktails.json: 元データにベクトルを付けたもの。scripts/embed_cocktails.py で生成する

ベクトル付きのファイルがなければ元データだけを読み、ベクトルなしで動く。
"""

import json
from pathlib import Path

from app.schemas import Cocktail

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SOURCE_PATH = DATA_DIR / "cocktails_source.json"
EMBEDDED_PATH = DATA_DIR / "cocktails.json"


def _load() -> tuple[list[Cocktail], dict[str, list[float]]]:
    path = EMBEDDED_PATH if EMBEDDED_PATH.exists() else SOURCE_PATH
    items = json.loads(path.read_text(encoding="utf-8"))
    cocktails = [Cocktail.model_validate(item) for item in items]
    vectors = {item["id"]: item["vector"] for item in items if "vector" in item}
    return cocktails, vectors


COCKTAILS, VECTORS = _load()
COCKTAILS_BY_ID: dict[str, Cocktail] = {c.id: c for c in COCKTAILS}
