"""お酒の一覧・詳細 API のテスト"""

import unittest

from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from app.cocktail_db import COCKTAILS, VECTORS
from app.main import app
from app.schemas import Cocktail, CocktailVector


class TestCocktailData(unittest.TestCase):
    def test_ids_are_unique(self) -> None:
        ids = [c.id for c in COCKTAILS]
        self.assertEqual(len(ids), len(set(ids)))

    def test_every_cocktail_has_vector(self) -> None:
        self.assertEqual(set(VECTORS), {c.id for c in COCKTAILS})


class TestCocktails(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_list(self) -> None:
        res = self.client.get("/cocktails")
        self.assertEqual(res.status_code, 200)
        cocktails = TypeAdapter(list[Cocktail]).validate_json(res.text)
        self.assertEqual(len(cocktails), len(COCKTAILS))
        self.assertNotIn('"vector"', res.text)

    def test_get(self) -> None:
        res = self.client.get("/cocktails/mojito")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Cocktail.model_validate_json(res.text).name, "モヒート")

    def test_get_not_found(self) -> None:
        res = self.client.get("/cocktails/unknown")
        self.assertEqual(res.status_code, 404)

    def test_list_vectors(self) -> None:
        res = self.client.get("/cocktails/vectors")
        self.assertEqual(res.status_code, 200)
        vectors = TypeAdapter(list[CocktailVector]).validate_json(res.text)
        self.assertEqual([v.id for v in vectors], [c.id for c in COCKTAILS])
        self.assertEqual(vectors[0].vector, VECTORS[vectors[0].id])

    def test_cors_allows_frontend_dev_server(self) -> None:
        res = self.client.get(
            "/cocktails/mojito", headers={"Origin": "http://localhost:5173"}
        )
        self.assertEqual(
            res.headers.get("access-control-allow-origin"), "http://localhost:5173"
        )


if __name__ == "__main__":
    unittest.main()
