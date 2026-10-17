"""データファイルの場所と型（import してもファイルは読まない）

- data/cocktails_source.json: カクテルの元データ（名前・別名・説明文・材料・ベース）
- data/cocktails.json: カクテルの元データに Gemini の埋め込みベクトルを付けたもの
- data/bases_source.json: ベース（ジン・ラムなど）の元データ（名前・別名・説明文）
- data/bases.json: ベースの元データに Gemini の埋め込みベクトルを付けたもの
"""

from pathlib import Path

from pydantic import TypeAdapter

from app.schemas import BaseSpirit, Cocktail

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SOURCE_PATH = DATA_DIR / "cocktails_source.json"
EMBEDDED_PATH = DATA_DIR / "cocktails.json"
BASES_SOURCE_PATH = DATA_DIR / "bases_source.json"
BASES_EMBEDDED_PATH = DATA_DIR / "bases.json"


class CocktailRecord(Cocktail):
    """カクテルのデータファイルの1件（API では返さないベクトルも持つ）"""

    vector: list[float] | None = None


class BaseRecord(BaseSpirit):
    """ベースのデータファイルの1件（API では返さないベクトルも持つ）"""

    vector: list[float] | None = None


RECORDS = TypeAdapter(list[CocktailRecord])
BASE_RECORDS = TypeAdapter(list[BaseRecord])


def read_records(path: Path) -> list[CocktailRecord]:
    """カクテルのデータファイルを読み、型を検証して返す"""
    return RECORDS.validate_json(path.read_bytes())


def read_base_records(path: Path) -> list[BaseRecord]:
    """ベースのデータファイルを読み、型を検証して返す"""
    return BASE_RECORDS.validate_json(path.read_bytes())
