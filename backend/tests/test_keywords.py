"""検索履歴のテキストマイニング（よく使われた言葉）のテスト"""

import sqlite3
import unittest

from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from app import keywords, query_log
from app.main import app
from app.schemas import KeywordCount
from tests.temp_db import use_temp_database

KEYWORD_COUNTS = TypeAdapter(list[KeywordCount])


class TestExtractWords(unittest.TestCase):
    def test_examples(self) -> None:
        for text, words in [
            ("甘くてフルーティなお酒が飲みたい", ["甘い", "フルーティ"]),
            ("さっぱり柑橘系", ["さっぱり", "柑橘"]),
            ("失恋を支えてくれるお酒", ["失恋", "支える"]),
            ("ジンベースで爽やかなカクテル", ["ジン", "爽やか"]),
            ("夏に飲みたい", ["夏"]),
        ]:
            with self.subTest(text=text):
                self.assertEqual(keywords.extract_words(text), words)

    def test_base_form(self) -> None:
        # 「甘く」「甘かった」は「甘い」にそろえる
        for text in ["甘くて飲みやすい", "甘かったお酒", "甘いのがいい"]:
            with self.subTest(text=text):
                self.assertIn("甘い", keywords.extract_words(text))

    def test_stopwords_removed(self) -> None:
        words = keywords.extract_words("とても飲みやすいおすすめのお酒が欲しい")
        for stopword in ["とても", "おすすめ", "お酒", "酒", "欲しい"]:
            self.assertNotIn(stopword, words)

    def test_same_word_once_per_query(self) -> None:
        self.assertEqual(keywords.extract_words("甘い甘い甘いお酒"), ["甘い"])

    def test_full_width_and_case_unified(self) -> None:
        self.assertEqual(keywords.extract_words("ＧＩＮ と Gin"), ["gin"])


class TestKeywordsApi(unittest.TestCase):
    def setUp(self) -> None:
        self.db_path = use_temp_database(self)
        self.client = TestClient(app)

    def keywords(self, params: dict[str, int] | None = None) -> list[KeywordCount]:
        res = self.client.get("/store/keywords", params=params)
        self.assertEqual(res.status_code, 200, res.text)
        return KEYWORD_COUNTS.validate_json(res.text)

    def test_empty(self) -> None:
        self.assertEqual(self.keywords(), [])

    def test_ranking_and_weight(self) -> None:
        for q in ["甘くてフルーティ", "甘いお酒", "さっぱり甘い", "甘くてフルーティ"]:
            query_log.record(q)
        self.assertEqual(
            [(k.word, k.count, k.weight) for k in self.keywords()],
            [("甘い", 4, 1.0), ("フルーティ", 2, 0.5), ("さっぱり", 1, 0.25)],
        )

    def test_limit(self) -> None:
        query_log.record("甘くてフルーティでさっぱり柑橘")
        self.assertEqual(len(self.keywords({"limit": 2})), 2)

    def test_days(self) -> None:
        query_log.record("甘い")
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO queries (query, created_at)"
                " VALUES ('苦い', datetime('now', '-10 days'))"
            )
        self.assertEqual([k.word for k in self.keywords({"days": 7})], ["甘い"])
        self.assertEqual({k.word for k in self.keywords()}, {"甘い", "苦い"})

    def test_invalid_params(self) -> None:
        for params in [{"limit": 0}, {"limit": 201}, {"days": 0}]:
            with self.subTest(params=params):
                res = self.client.get("/store/keywords", params=params)
                self.assertEqual(res.status_code, 422)


if __name__ == "__main__":
    unittest.main()
