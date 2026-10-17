"""お酒の一覧・詳細 API のテスト"""

import unittest

from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from app.cocktail_db import (
    BASE_VECTORS,
    BASES,
    BASES_BY_ID,
    COCKTAILS,
    COCKTAILS_BY_ID,
    VECTORS,
)
from app.data_files import BASES_EMBEDDED_PATH, EMBEDDED_PATH
from app.main import app
from app.schemas import Cocktail, CocktailVector


class TestCocktailData(unittest.TestCase):
    def test_ids_are_unique(self) -> None:
        ids = [c.id for c in COCKTAILS]
        self.assertEqual(len(ids), len(set(ids)))

    def test_every_cocktail_has_vector(self) -> None:
        self.assertEqual(set(VECTORS), {c.id for c in COCKTAILS})


class TestBaseData(unittest.TestCase):
    def test_bases(self) -> None:
        self.assertEqual(len(BASES), 13)
        self.assertIn("gin", BASES_BY_ID)
        self.assertIn("ウオッカ", BASES_BY_ID["vodka"].aliases)

    def test_every_base_has_vector(self) -> None:
        self.assertEqual(set(BASE_VECTORS), set(BASES_BY_ID))
        self.assertTrue(all(len(v) == 768 for v in BASE_VECTORS.values()))

    def test_cocktail_bases_exist(self) -> None:
        for c in COCKTAILS:
            with self.subTest(cocktail=c.id):
                self.assertTrue(set(c.bases) <= set(BASES_BY_ID))

    def test_examples(self) -> None:
        for cocktail_id, bases in [
            ("gin-and-tonic", ["gin"]),
            ("mojito", ["rum"]),
            ("cassis-and-orange", ["liqueur"]),
            ("lemon-sour", ["shochu"]),
            ("long-island-iced-tea", ["tequila", "rum", "gin"]),
            ("virgin-mary", []),
        ]:
            with self.subTest(cocktail=cocktail_id):
                self.assertEqual(COCKTAILS_BY_ID[cocktail_id].bases, bases)

    def test_only_non_alcoholic_without_base(self) -> None:
        self.assertEqual(sum(1 for c in COCKTAILS if not c.bases), 18)


class TestDataFileFormat(unittest.TestCase):
    """ベクトル付きのファイルは1件1行（差分を変えた件の行だけにするため）"""

    def test_one_record_per_line(self) -> None:
        for path, count in [
            (EMBEDDED_PATH, len(COCKTAILS)),
            (BASES_EMBEDDED_PATH, len(BASES)),
        ]:
            with self.subTest(path=path.name):
                lines = path.read_text(encoding="utf-8").splitlines()
                self.assertEqual(lines[0], "[")
                self.assertEqual(lines[-1], "]")
                self.assertEqual(len(lines), count + 2)


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
