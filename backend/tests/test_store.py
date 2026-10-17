"""店舗向けの集計 API のテスト（テストごとに一時的な SQLite ファイルを使う）"""

import sqlite3
import unittest

from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from app import query_log
from app.main import app
from app.schemas import QueryCount
from tests.temp_db import use_temp_database

QUERY_COUNTS = TypeAdapter(list[QueryCount])


class TestPopularQueries(unittest.TestCase):
    def setUp(self) -> None:
        self.db_path = use_temp_database(self)
        self.client = TestClient(app)

    def ranking(self, params: dict[str, int] | None = None) -> list[tuple[str, int]]:
        res = self.client.get("/store/queries", params=params)
        self.assertEqual(res.status_code, 200, res.text)
        return [(q.query, q.count) for q in QUERY_COUNTS.validate_json(res.text)]

    def test_empty(self) -> None:
        self.assertEqual(self.ranking(), [])

    def test_most_frequent_first(self) -> None:
        for q in ["甘い", "さっぱり", "甘い", "失恋", "甘い", "さっぱり"]:
            query_log.record(q)
        self.assertEqual(self.ranking(), [("甘い", 3), ("さっぱり", 2), ("失恋", 1)])

    def test_same_count_latest_first(self) -> None:
        for q in ["甘い", "さっぱり"]:
            query_log.record(q)
        self.assertEqual(self.ranking(), [("さっぱり", 1), ("甘い", 1)])

    def test_notation_unified(self) -> None:
        for q in ["甘くて　フルーティ", " 甘くて フルーティ ", "甘くて  フルーティ"]:
            query_log.record(q)
        self.assertEqual(self.ranking(), [("甘くて フルーティ", 3)])

    def test_blank_not_recorded(self) -> None:
        query_log.record("   ")
        self.assertEqual(self.ranking(), [])

    def test_limit(self) -> None:
        for i in range(5):
            query_log.record(f"入力{i}")
        self.assertEqual(len(self.ranking({"limit": 3})), 3)

    def test_days(self) -> None:
        query_log.record("最近")
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO queries (query, created_at)"
                " VALUES ('昔', datetime('now', '-10 days'))"
            )
        self.assertEqual(self.ranking({"days": 7}), [("最近", 1)])
        self.assertEqual(self.ranking(), [("最近", 1), ("昔", 1)])

    def test_invalid_params(self) -> None:
        for params in [{"limit": 0}, {"limit": 101}, {"days": 0}, {"days": 366}]:
            with self.subTest(params=params):
                res = self.client.get("/store/queries", params=params)
                self.assertEqual(res.status_code, 422)


if __name__ == "__main__":
    unittest.main()
