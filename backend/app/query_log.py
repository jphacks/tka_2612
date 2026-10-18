"""おすすめで使われた入力文の記録と集計（SQLite に保存する）

店舗向けの「よく求められた味」の集計に使う。誰が入力したかは記録しない。
"""

import unicodedata
from contextlib import closing

from app import db


def normalize(query: str) -> str:
    """集計用に、全角半角と空白の違いをそろえる"""
    return " ".join(unicodedata.normalize("NFKC", query).split())


def record(query: str) -> None:
    """入力文を1件記録する"""
    text = normalize(query)
    if not text:
        return
    with closing(db.connect()) as conn, conn:
        conn.execute("INSERT INTO queries (query) VALUES (?)", (text,))


def ranking(limit: int | None, days: int | None = None) -> list[tuple[str, int]]:
    """よく入力された文と回数を、多い順に返す

    limit が None ならすべて返す。days を指定すると、直近 days 日の分だけを数える。
    回数が同じなら、最近入力された順。
    """
    since = f"-{days} days" if days is not None else None
    with closing(db.connect()) as conn:
        rows: list[tuple[str, int]] = conn.execute(
            "SELECT query, COUNT(*) AS n FROM queries"
            " WHERE ? IS NULL OR created_at >= datetime('now', ?)"
            " GROUP BY query ORDER BY n DESC, MAX(created_at) DESC, MAX(id) DESC"
            " LIMIT ?",
            # SQLite の LIMIT -1 は「上限なし」
            (since, since, -1 if limit is None else limit),
        ).fetchall()
    return rows
