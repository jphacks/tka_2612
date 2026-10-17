"""SQLite のデータベース（お気に入りなど、ユーザーの操作で増えるデータを保存する）

ファイルの場所は環境変数 DATABASE_PATH で変えられる（既定は backend/data/app.db）。
テーブルがなければ、最初につないだときに作る。
"""

import os
import sqlite3
from pathlib import Path

DEFAULT_PATH = Path(__file__).resolve().parent.parent / "data" / "app.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS favorites (
    device_id   TEXT NOT NULL,
    cocktail_id TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (device_id, cocktail_id)
);

-- お酒ごとのお気に入りの総数。favorites の登録・解除と同じトランザクションで更新する
CREATE TABLE IF NOT EXISTS favorite_counts (
    cocktail_id TEXT PRIMARY KEY,
    count       INTEGER NOT NULL CHECK (count >= 0)
);
"""


def database_path() -> Path:
    return Path(os.environ.get("DATABASE_PATH", DEFAULT_PATH))


def connect() -> sqlite3.Connection:
    """データベースにつなぐ。使い終わったら close する"""
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn
