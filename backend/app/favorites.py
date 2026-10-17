"""お気に入りの登録・解除と、お酒ごとの総数（SQLite に保存する）"""

import sqlite3
from contextlib import closing

from app import db


def add(device_id: str, cocktail_id: str) -> int:
    """お気に入りに登録し、そのお酒の総数を返す。登録済みなら何もしない"""
    with closing(db.connect()) as conn, conn:
        cur = conn.execute(
            "INSERT OR IGNORE INTO favorites (device_id, cocktail_id) VALUES (?, ?)",
            (device_id, cocktail_id),
        )
        if cur.rowcount:
            conn.execute(
                "INSERT INTO favorite_counts (cocktail_id, count) VALUES (?, 1)"
                " ON CONFLICT (cocktail_id) DO UPDATE SET count = count + 1",
                (cocktail_id,),
            )
        return _count(conn, cocktail_id)


def remove(device_id: str, cocktail_id: str) -> int:
    """お気に入りを解除し、そのお酒の総数を返す。未登録なら何もしない"""
    with closing(db.connect()) as conn, conn:
        cur = conn.execute(
            "DELETE FROM favorites WHERE device_id = ? AND cocktail_id = ?",
            (device_id, cocktail_id),
        )
        if cur.rowcount:
            conn.execute(
                "UPDATE favorite_counts SET count = count - 1 WHERE cocktail_id = ?",
                (cocktail_id,),
            )
        return _count(conn, cocktail_id)


def list_ids(device_id: str) -> list[str]:
    """端末のお気に入りのお酒のID（新しく登録した順）"""
    with closing(db.connect()) as conn:
        rows: list[tuple[str]] = conn.execute(
            "SELECT cocktail_id FROM favorites WHERE device_id = ?"
            " ORDER BY created_at DESC, rowid DESC",
            (device_id,),
        ).fetchall()
    return [cocktail_id for (cocktail_id,) in rows]


def counts() -> list[tuple[str, int]]:
    """お気に入りの総数が1以上のお酒の (ID, 総数)。多い順"""
    with closing(db.connect()) as conn:
        rows: list[tuple[str, int]] = conn.execute(
            "SELECT cocktail_id, count FROM favorite_counts WHERE count > 0"
            " ORDER BY count DESC, cocktail_id"
        ).fetchall()
    return rows


def _count(conn: sqlite3.Connection, cocktail_id: str) -> int:
    row: tuple[int] | None = conn.execute(
        "SELECT count FROM favorite_counts WHERE cocktail_id = ?", (cocktail_id,)
    ).fetchone()
    return row[0] if row else 0
