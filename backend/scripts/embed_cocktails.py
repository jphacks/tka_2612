"""カクテルとベースの元データにベクトルを付けて書き出す

- data/cocktails_source.json → data/cocktails.json
- data/bases_source.json → data/bases.json

元データを変えたら実行し直して、一緒にコミットする。GEMINI_API_KEY が必要（backend/.env に書く）。
名前と説明文が前回と同じものは、前回のベクトルを使い回し、Gemini には送らない。
モデルや次元を変えたときは、ベクトル付きのファイルを消してから実行して全件作り直す。
"""

import time
from pathlib import Path

from pydantic import BaseModel, TypeAdapter

from app import embedding, gemini
from app.data_files import (
    BASE_RECORDS,
    BASES_EMBEDDED_PATH,
    BASES_SOURCE_PATH,
    EMBEDDED_PATH,
    RECORDS,
    SOURCE_PATH,
    BaseRecord,
    CocktailRecord,
    read_base_records,
    read_records,
)

# 無料枠の回数制限（1分あたりの件数）を超えないよう、間隔を空けて少しずつ送る。
# 実行中や直後はサーバー側の入力文のベクトル化も枠を使うので、少し余裕を持たせる
BATCH_SIZE = 20
WAIT_SECONDS = 60 * BATCH_SIZE / embedding.REQUESTS_PER_MINUTE + 1


class _Previous(BaseModel):
    """前回のファイルのうち、ベクトルの使い回しに必要な項目だけ（ほかの項目は読み飛ばす）"""

    name: str
    description: str
    vector: list[float] | None = None


_PREVIOUS = TypeAdapter(list[_Previous])


def read_previous(path: Path) -> list[_Previous]:
    """前回のベクトル付きファイルを読む。なければ空"""
    return _PREVIOUS.validate_json(path.read_bytes()) if path.exists() else []


def fill_vectors[R: (CocktailRecord, BaseRecord)](
    label: str, records: list[R], previous: list[_Previous]
) -> None:
    """前回と名前・説明文が同じものは前回のベクトルを使い、残りを Gemini でベクトル化する"""
    reuse = {
        (r.name, r.description): r.vector for r in previous if r.vector is not None
    }
    for r in records:
        r.vector = reuse.get((r.name, r.description))
    todo = [r for r in records if r.vector is None]
    print(
        f"{label}: {len(records)} 件中 {len(records) - len(todo)} 件は前回のベクトルを使う"
    )

    if todo and not gemini.is_available():
        raise SystemExit("GEMINI_API_KEY が設定されていません（backend/.env を確認）")

    for start in range(0, len(todo), BATCH_SIZE):
        batch = todo[start : start + BATCH_SIZE]
        vectors = embedding.embed_documents(
            [r.name for r in batch], [r.description for r in batch]
        )
        for r, vector in zip(batch, vectors, strict=True):
            # ファイルを小さくするため、小数は6桁に丸める
            r.vector = [round(v, 6) for v in vector]
        print(f"{label}: {start + len(batch)} / {len(todo)} 件をベクトル化")
        if start + BATCH_SIZE < len(todo):
            time.sleep(WAIT_SECONDS)


def main() -> None:
    cocktails = read_records(SOURCE_PATH)
    fill_vectors("カクテル", cocktails, read_previous(EMBEDDED_PATH))
    EMBEDDED_PATH.write_bytes(RECORDS.dump_json(cocktails) + b"\n")

    bases = read_base_records(BASES_SOURCE_PATH)
    fill_vectors("ベース", bases, read_previous(BASES_EMBEDDED_PATH))
    BASES_EMBEDDED_PATH.write_bytes(BASE_RECORDS.dump_json(bases) + b"\n")

    print(f"{EMBEDDED_PATH} と {BASES_EMBEDDED_PATH} を生成しました")
    print(f"（{embedding.MODEL}, {embedding.DIMENSIONS} 次元）")


if __name__ == "__main__":
    main()
