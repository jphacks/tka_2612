"""お酒の元データにベクトルを付けて data/cocktails.json に書き出す

元データ（data/cocktails_source.json）を変えたら実行し直して、一緒にコミットする。
GEMINI_API_KEY が必要（backend/.env に書く）。
"""

import json
import time

from app import embedding
from app.cocktail_db import EMBEDDED_PATH, SOURCE_PATH

# 無料枠の回数制限に引っかからないよう、少しずつ送る
BATCH_SIZE = 20
WAIT_SECONDS = 1.0


def main() -> None:
    if not embedding.is_available():
        raise SystemExit("GEMINI_API_KEY が設定されていません（backend/.env を確認）")

    items = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    for start in range(0, len(items), BATCH_SIZE):
        batch = items[start : start + BATCH_SIZE]
        vectors = embedding.embed_documents(
            [item["name"] for item in batch],
            [item["description"] for item in batch],
        )
        for item, vector in zip(batch, vectors, strict=True):
            # ファイルを小さくするため、小数は6桁に丸める
            item["vector"] = [round(v, 6) for v in vector]
        print(f"{start + len(batch)} / {len(items)} 件")
        time.sleep(WAIT_SECONDS)

    EMBEDDED_PATH.write_text(
        json.dumps(items, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(
        f"{EMBEDDED_PATH} を生成しました（{embedding.MODEL}, {embedding.DIMENSIONS} 次元）"
    )


if __name__ == "__main__":
    main()
