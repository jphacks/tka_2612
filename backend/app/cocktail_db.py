"""お酒とベースのデータの読み込み

サーバー起動時に一度だけ読み込み、メモリに保持する（ファイルの場所と型は app/data_files.py）。
ベクトル付きのファイルがなければ元データだけを読み、ベクトルなしで動く。
"""

from pathlib import Path

from app.data_files import (
    BASES_EMBEDDED_PATH,
    BASES_SOURCE_PATH,
    EMBEDDED_PATH,
    SOURCE_PATH,
    BaseRecord,
    CocktailRecord,
    read_base_records,
    read_records,
)
from app.schemas import BaseSpirit, Cocktail


def _existing(embedded: Path, source: Path) -> Path:
    """ベクトル付きのファイルがあればそれを、なければ元データを使う"""
    return embedded if embedded.exists() else source


def _vectors(
    records: list[CocktailRecord] | list[BaseRecord],
) -> dict[str, list[float]]:
    """ID ごとのベクトル（ベクトルのない件は含めない）"""
    return {r.id: r.vector for r in records if r.vector is not None}


_cocktail_records = read_records(_existing(EMBEDDED_PATH, SOURCE_PATH))
# API ではベクトルを返さないので、ベクトルを除いて持つ
COCKTAILS = [
    Cocktail.model_validate(r.model_dump(exclude={"vector"})) for r in _cocktail_records
]
VECTORS = _vectors(_cocktail_records)
COCKTAILS_BY_ID: dict[str, Cocktail] = {c.id: c for c in COCKTAILS}

_base_records = read_base_records(_existing(BASES_EMBEDDED_PATH, BASES_SOURCE_PATH))
BASES = [
    BaseSpirit.model_validate(r.model_dump(exclude={"vector"})) for r in _base_records
]
BASE_VECTORS = _vectors(_base_records)
BASES_BY_ID: dict[str, BaseSpirit] = {b.id: b for b in BASES}
