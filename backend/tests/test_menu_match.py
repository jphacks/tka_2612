"""メニューの名前の照合 API のテスト"""

import unittest

from fastapi.testclient import TestClient

from app import menu_matching
from app.main import app
from app.schemas import MenuMatchResponse


class TestNormalize(unittest.TestCase):
    def test_variants_become_same(self) -> None:
        for a, b in [
            ("カシス・オレンジ", "カシスオレンジ"),
            ("モスコー・ミュール", "モスコミュール"),
            ("Gin and Tonic", "gin tonic"),
            ("ＧＩＮ　ＴＯＮＩＣ", "Gin Tonic"),
            ("モヒート（ミント）", "モヒート"),
            ("カシスオレンジ ¥700", "カシスオレンジ"),
            ("カシスオレンジ 700円", "カシスオレンジ"),
        ]:
            with self.subTest(a=a, b=b):
                self.assertEqual(menu_matching.normalize(a), menu_matching.normalize(b))


class TestMatch(unittest.TestCase):
    def assert_match(self, name: str, cocktail_id: str) -> None:
        cocktail = menu_matching.match(name)
        self.assertIsNotNone(cocktail, name)
        assert cocktail is not None
        self.assertEqual(cocktail.id, cocktail_id)

    def test_exact_name(self) -> None:
        self.assert_match("モヒート", "mojito")

    def test_alias(self) -> None:
        self.assert_match("カシオレ", "cassis-and-orange")
        self.assert_match("Moscow Mule", "moscow-mule")
        self.assert_match("ハイボール", "whiskey-and-soda")

    def test_notation_variants(self) -> None:
        self.assert_match("ソルティードッグ", "salty-dog")
        self.assert_match("ブラッディーマリー", "bloody-mary")

    def test_fuzzy(self) -> None:
        self.assert_match("ジントニク", "gin-and-tonic")

    def test_not_match_unrelated(self) -> None:
        for name in ["生ビール", "ウーロン茶", "店長おすすめサワー", ""]:
            with self.subTest(name=name):
                self.assertIsNone(menu_matching.match(name))


class TestMenuMatchApi(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def post(self, names: list[str]) -> MenuMatchResponse:
        res = self.client.post("/menu/match", json={"names": names})
        self.assertEqual(res.status_code, 200)
        return MenuMatchResponse.model_validate_json(res.text)

    def test_matched_and_unregistered(self) -> None:
        body = self.post(
            ["カシスオレンジ ¥700", "モスコミュール", "店長おすすめサワー"]
        )
        self.assertEqual(
            [(m.name, m.cocktail.id) for m in body.matched],
            [
                ("カシスオレンジ ¥700", "cassis-and-orange"),
                ("モスコミュール", "moscow-mule"),
            ],
        )
        self.assertEqual(body.unregistered, ["店長おすすめサワー"])

    def test_same_cocktail_once(self) -> None:
        body = self.post(["カシスオレンジ", "カシオレ"])
        self.assertEqual([m.cocktail.id for m in body.matched], ["cassis-and-orange"])

    def test_blank_names_skipped(self) -> None:
        body = self.post(["", "  "])
        self.assertEqual(body, MenuMatchResponse(matched=[], unregistered=[]))

    def test_too_many_names(self) -> None:
        res = self.client.post("/menu/match", json={"names": ["モヒート"] * 201})
        self.assertEqual(res.status_code, 422)


if __name__ == "__main__":
    unittest.main()
