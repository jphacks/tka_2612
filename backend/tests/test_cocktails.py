"""お酒の一覧・詳細 API のテスト"""

import unittest

from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from app.cocktail_db import COCKTAILS, VECTORS
from app.main import app
from app.schemas import Cocktail


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


if __name__ == "__main__":
    unittest.main()
