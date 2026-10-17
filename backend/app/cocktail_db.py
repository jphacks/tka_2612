"""お酒とベースのデータの読み込み

サーバー起動時に一度だけ読み込み、メモリに保持する（ファイルの場所と型は app/data_files.py）。
ベクトル付きのファイルがなければ元データだけを読み、ベクトルなしで動く。
"""

from app.data_files import (
    BASES_EMBEDDED_PATH,
    BASES_SOURCE_PATH,
    EMBEDDED_PATH,
    SOURCE_PATH,
    read_base_records,
    read_records,
)
from app.schemas import BaseSpirit, Cocktail


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
            bases=r.bases,
        )
        for r in records
    ]
    vectors = {r.id: r.vector for r in records if r.vector is not None}
    return cocktails, vectors


def _load_bases() -> tuple[list[BaseSpirit], dict[str, list[float]]]:
    path = BASES_EMBEDDED_PATH if BASES_EMBEDDED_PATH.exists() else BASES_SOURCE_PATH
    records = read_base_records(path)
    bases = [
        BaseSpirit(id=r.id, name=r.name, aliases=r.aliases, description=r.description)
        for r in records
    ]
    vectors = {r.id: r.vector for r in records if r.vector is not None}
    return bases, vectors


COCKTAILS, VECTORS = _load()
COCKTAILS_BY_ID: dict[str, Cocktail] = {c.id: c for c in COCKTAILS}

BASES, BASE_VECTORS = _load_bases()
BASES_BY_ID: dict[str, BaseSpirit] = {b.id: b for b in BASES}
