"""おすすめ API のテスト（Gemini は呼ばずに差し替える）"""

import math
import unittest
from unittest import mock

from fastapi.testclient import TestClient
from google.genai import errors

from app import embedding, gemini
from app.cocktail_db import COCKTAILS, VECTORS
from app.main import app

# 偽のベクトルの角度の刻み（角度が半周を超えないよう、件数で割る）
STEP = 1 / len(COCKTAILS)


class TestRecommendations(unittest.TestCase):
    """i 番目のお酒は、入力文のベクトル [1, 0] から角度 STEP * i だけ離れている
    → 一覧の先頭のお酒ほど一致度が高い
    """

    def setUp(self) -> None:
        self.client = TestClient(app)
        fake_vectors = {
            c.id: [math.cos(STEP * i), math.sin(STEP * i)]
            for i, c in enumerate(COCKTAILS)
        }
        for patcher in [
            mock.patch.object(gemini, "is_available", return_value=True),
            mock.patch.dict(VECTORS, fake_vectors, clear=True),
        ]:
            patcher.start()
            self.addCleanup(patcher.stop)
        patcher = mock.patch.object(embedding, "embed_query", return_value=[1.0, 0.0])
        self.embed_query = patcher.start()
        self.addCleanup(patcher.stop)

    def recommend(self, body: dict) -> dict:
        res = self.client.post("/recommendations", json=body)
        self.assertEqual(res.status_code, 200, res.text)
        return res.json()

    def ids(self, body: dict) -> list[str]:
        return [r["cocktail"]["id"] for r in body["recommendations"]]

    def test_whole_database(self) -> None:
        body = self.recommend({"query": "甘くてフルーティ"})
        self.assertEqual(body["query"], "甘くてフルーティ")
        self.assertEqual(self.ids(body), [c.id for c in COCKTAILS[:5]])
        scores = [r["score"] for r in body["recommendations"]]
        self.assertAlmostEqual(scores[0], 1.0)
        self.assertAlmostEqual(scores[1], math.cos(STEP))

    def test_only_given_cocktails(self) -> None:
        menu = [COCKTAILS[i].id for i in (30, 10, 20)]
        body = self.recommend({"query": "甘い", "cocktail_ids": menu})
        self.assertEqual(self.ids(body), [COCKTAILS[i].id for i in (10, 20, 30)])

    def test_duplicate_ids_once(self) -> None:
        body = self.recommend({"query": "甘い", "cocktail_ids": ["mojito", "mojito"]})
        self.assertEqual(self.ids(body), ["mojito"])

    def test_empty_ids(self) -> None:
        body = self.recommend({"query": "甘い", "cocktail_ids": []})
        self.assertEqual(body["recommendations"], [])
        self.embed_query.assert_not_called()

    def test_unknown_id(self) -> None:
        res = self.client.post(
            "/recommendations", json={"query": "甘い", "cocktail_ids": ["unknown"]}
        )
        self.assertEqual(res.status_code, 422)

    def test_query_is_embedded(self) -> None:
        self.recommend({"query": "失恋を支えてくれるお酒"})
        self.embed_query.assert_called_once_with("失恋を支えてくれるお酒")

    def test_query_required(self) -> None:
        for body in [{}, {"query": ""}, {"query": "あ" * 501}]:
            with self.subTest(body=body):
                res = self.client.post("/recommendations", json=body)
                self.assertEqual(res.status_code, 422)

    def test_api_key_missing(self) -> None:
        with mock.patch.object(gemini, "is_available", return_value=False):
            res = self.client.post("/recommendations", json={"query": "甘い"})
        self.assertEqual(res.status_code, 503)

    def test_gemini_error(self) -> None:
        self.embed_query.side_effect = errors.ClientError(
            429, {"error": {"code": 429, "status": "RESOURCE_EXHAUSTED"}}
        )
        res = self.client.post("/recommendations", json={"query": "甘い"})
        self.assertEqual(res.status_code, 503)


class TestEmbedQueryCache(unittest.TestCase):
    """同じ入力文のベクトルは保持しておき、Gemini を呼ばずに再利用する"""

    def setUp(self) -> None:
        embedding._embed_query_cached.cache_clear()
        self.addCleanup(embedding._embed_query_cached.cache_clear)
        patcher = mock.patch.object(embedding, "_embed", return_value=[[1.0, 0.0]])
        self.embed = patcher.start()
        self.addCleanup(patcher.stop)

    def test_same_query_calls_gemini_once(self) -> None:
        first = embedding.embed_query("甘い")
        second = embedding.embed_query("甘い")
        self.assertEqual(first, [1.0, 0.0])
        self.assertEqual(first, second)
        self.embed.assert_called_once()

    def test_surrounding_spaces_ignored(self) -> None:
        embedding.embed_query("甘い")
        embedding.embed_query("  甘い\n")
        self.embed.assert_called_once()

    def test_different_query_calls_gemini(self) -> None:
        embedding.embed_query("甘い")
        embedding.embed_query("さっぱり")
        self.assertEqual(self.embed.call_count, 2)

    def test_returned_vector_is_a_copy(self) -> None:
        embedding.embed_query("甘い").append(9.9)
        self.assertEqual(embedding.embed_query("甘い"), [1.0, 0.0])


class TestCosineSimilarity(unittest.TestCase):
    def test_same_direction(self) -> None:
        self.assertAlmostEqual(embedding.cosine_similarity([1, 2], [2, 4]), 1.0)

    def test_orthogonal(self) -> None:
        self.assertAlmostEqual(embedding.cosine_similarity([1, 0], [0, 3]), 0.0)

    def test_zero_vector(self) -> None:
        self.assertEqual(embedding.cosine_similarity([0, 0], [1, 1]), 0.0)


if __name__ == "__main__":
    unittest.main()
