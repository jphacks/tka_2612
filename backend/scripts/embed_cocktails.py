"""お酒の元データにベクトルを付けて data/cocktails.json に書き出す

元データ（data/cocktails_source.json）を変えたら実行し直して、一緒にコミットする。
GEMINI_API_KEY が必要（backend/.env に書く）。

名前と説明文が前回と同じお酒は、前回のベクトルを使い回し、Gemini には送らない。
モデルや次元を変えたときは、data/cocktails.json を消してから実行して全件作り直す。
"""

import json
import time

from app import embedding, gemini
from app.cocktail_db import EMBEDDED_PATH, SOURCE_PATH

# 無料枠の回数制限（1分あたりの件数）を超えないよう、間隔を空けて少しずつ送る。
# 実行中や直後はサーバー側の入力文のベクトル化も枠を使うので、少し余裕を持たせる
BATCH_SIZE = 20
WAIT_SECONDS = 60 * BATCH_SIZE / embedding.REQUESTS_PER_MINUTE + 1


def _previous_vectors() -> dict[tuple[str, str], list[float]]:
    """前回のベクトルを (名前, 説明文) ごとに引けるようにする"""
    if not EMBEDDED_PATH.exists():
        return {}
    items = json.loads(EMBEDDED_PATH.read_text(encoding="utf-8"))
    return {(i["name"], i["description"]): i["vector"] for i in items if "vector" in i}


def main() -> None:
    items = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    previous = _previous_vectors()
    for item in items:
        if vector := previous.get((item["name"], item["description"])):
            item["vector"] = vector
    todo = [item for item in items if "vector" not in item]
    print(f"{len(items)} 件中 {len(items) - len(todo)} 件は前回のベクトルを使う")

    if todo and not gemini.is_available():
        raise SystemExit("GEMINI_API_KEY が設定されていません（backend/.env を確認）")

    for start in range(0, len(todo), BATCH_SIZE):
        batch = todo[start : start + BATCH_SIZE]
        vectors = embedding.embed_documents(
            [item["name"] for item in batch],
            [item["description"] for item in batch],
        )
        for item, vector in zip(batch, vectors, strict=True):
            # ファイルを小さくするため、小数は6桁に丸める
            item["vector"] = [round(v, 6) for v in vector]
        print(f"{start + len(batch)} / {len(todo)} 件をベクトル化")
        if start + BATCH_SIZE < len(todo):
            time.sleep(WAIT_SECONDS)

    EMBEDDED_PATH.write_text(
        json.dumps(items, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(
        f"{EMBEDDED_PATH} を生成しました（{embedding.MODEL}, {embedding.DIMENSIONS} 次元）"
    )


if __name__ == "__main__":
    main()
