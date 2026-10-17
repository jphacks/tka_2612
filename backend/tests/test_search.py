"""お酒の検索 API のテスト（Gemini は呼ばずに差し替える）"""

import math
import unittest
from unittest import mock

from fastapi.testclient import TestClient
from google.genai import errors

from app import embedding, gemini, query_log
from app.cocktail_db import COCKTAILS, VECTORS
from app.main import app
from app.schemas import SearchRequest, SearchResponse
from tests.temp_db import use_temp_database

# 偽のベクトルの角度の刻み（角度が半周を超えないよう、件数で割る）
STEP = 1 / len(COCKTAILS)


class TestSearch(unittest.TestCase):
    """i 番目のお酒は、入力文のベクトル [1, 0] から角度 STEP * i だけ離れている
    → 一覧の先頭のお酒ほど一致度が高い
    """

    def setUp(self) -> None:
        use_temp_database(self)
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

    def post(self, text: str) -> int:
        res = self.client.post(
            "/cocktails/search",
            content=SearchRequest(text=text).model_dump_json(),
            headers={"Content-Type": "application/json"},
        )
        self.last_text = res.text
        return res.status_code

    def search(self, text: str) -> SearchResponse:
        self.assertEqual(self.post(text), 200, self.last_text)
        return SearchResponse.model_validate_json(self.last_text)

    def test_nearest_100(self) -> None:
        body = self.search("甘くてフルーティ")
        self.assertEqual(body.text, "甘くてフルーティ")
        self.assertEqual(
            [r.cocktail.id for r in body.results], [c.id for c in COCKTAILS[:100]]
        )
        self.assertAlmostEqual(body.results[0].score, 1.0)
        self.assertAlmostEqual(body.results[99].score, math.cos(STEP * 99))

    def test_sorted_by_score(self) -> None:
        scores = [r.score for r in self.search("甘い").results]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_text_is_embedded(self) -> None:
        self.search("失恋を支えてくれるお酒")
        self.embed_query.assert_called_once_with("失恋を支えてくれるお酒")

    def test_not_recorded_for_store(self) -> None:
        self.search("甘い")
        self.assertEqual(query_log.ranking(limit=100), [])

    def test_text_required(self) -> None:
        for body in [{}, {"text": ""}, {"text": "あ" * 501}]:
            with self.subTest(body=body):
                res = self.client.post("/cocktails/search", json=body)
                self.assertEqual(res.status_code, 422)

    def test_api_key_missing(self) -> None:
        with mock.patch.object(gemini, "is_available", return_value=False):
            self.assertEqual(self.post("甘い"), 503)

    def test_gemini_error(self) -> None:
        self.embed_query.side_effect = errors.ClientError(
            429, {"error": {"code": 429, "status": "RESOURCE_EXHAUSTED"}}
        )
        self.assertEqual(self.post("甘い"), 503)


if __name__ == "__main__":
    unittest.main()
