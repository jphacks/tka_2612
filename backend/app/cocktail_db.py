"""お酒のデータの読み込み

- data/cocktails_source.json: 元データ（名前・別名・説明文・材料）
- data/cocktails.json: 元データに Gemini の埋め込みベクトルを付けたもの

サーバー起動時に一度だけ読み込み、メモリに保持する。
ベクトル付きのファイルがなければ元データだけを読み、ベクトルなしで動く。
"""

from pathlib import Path

from pydantic import TypeAdapter

from app.schemas import Cocktail

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SOURCE_PATH = DATA_DIR / "cocktails_source.json"
EMBEDDED_PATH = DATA_DIR / "cocktails.json"


class CocktailRecord(Cocktail):
    """データファイルの1件（API では返さないベクトルも持つ）"""

    vector: list[float] | None = None


RECORDS = TypeAdapter(list[CocktailRecord])


def read_records(path: Path) -> list[CocktailRecord]:
    """データファイルを読み、型を検証して返す"""
    return RECORDS.validate_json(path.read_bytes())


def _load() -> tuple[list[Cocktail], dict[str, list[float]]]:
    path = EMBEDDED_PATH if EMBEDDED_PATH.exists() else SOURCE_PATH
    records = read_records(path)
    cocktails = [
        Cocktail(
            id=r.id,
            name=r.name,
            aliases=r.aliases,
            description=r.description,
            ingredients=r.ingredients,
        )
        for r in records
    ]
    vectors = {r.id: r.vector for r in records if r.vector is not None}
    return cocktails, vectors


COCKTAILS, VECTORS = _load()
COCKTAILS_BY_ID: dict[str, Cocktail] = {c.id: c for c in COCKTAILS}
