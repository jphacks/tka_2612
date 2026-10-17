"""モック API のテスト"""

import unittest

from fastapi.testclient import TestClient

from app import store
from app.main import app
from app.mock_data import COCKTAILS, MOCK_MENU_COCKTAIL_IDS, MOCK_UNREGISTERED


class ApiTestCase(unittest.TestCase):
    def setUp(self) -> None:
        store.clear()
        self.client = TestClient(app)

    def recommend(self, query: str, *, with_image: bool = False) -> dict:
        files = {"image": ("menu.jpg", b"dummy", "image/jpeg")} if with_image else None
        res = self.client.post("/recommendations", data={"query": query}, files=files)
        self.assertEqual(res.status_code, 200)
        return res.json()

    def feedback(self, cocktail_id: str, rating: str, device_id: str = "d1") -> int:
        res = self.client.post(
            "/feedback",
            json={
                "device_id": device_id,
                "cocktail_id": cocktail_id,
                "rating": rating,
                "query": "甘い",
            },
        )
        return res.status_code


class TestHealth(ApiTestCase):
    def test_health(self) -> None:
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"status": "ok"})


class TestCocktails(ApiTestCase):
    def test_list(self) -> None:
        res = self.client.get("/cocktails")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), len(COCKTAILS))

    def test_get(self) -> None:
        res = self.client.get("/cocktails/mojito")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["name"], "モヒート")

    def test_get_not_found(self) -> None:
        res = self.client.get("/cocktails/unknown")
        self.assertEqual(res.status_code, 404)


class TestRecommendations(ApiTestCase):
    def test_without_image(self) -> None:
        body = self.recommend("失恋を支えてくれるお酒")
        self.assertEqual(body["query"], "失恋を支えてくれるお酒")
        self.assertEqual(len(body["recommendations"]), 5)
        self.assertEqual(body["unregistered"], [])

    def test_with_image(self) -> None:
        body = self.recommend("甘くてフルーティ", with_image=True)
        ids = [r["cocktail"]["id"] for r in body["recommendations"]]
        self.assertEqual(len(ids), 5)
        self.assertTrue(set(ids) <= set(MOCK_MENU_COCKTAIL_IDS))
        self.assertEqual(body["unregistered"], MOCK_UNREGISTERED)

    def test_sorted_by_score(self) -> None:
        body = self.recommend("甘くてフルーティ")
        scores = [r["score"] for r in body["recommendations"]]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_no_duplicates(self) -> None:
        body = self.recommend("甘くてフルーティ")
        ids = [r["cocktail"]["id"] for r in body["recommendations"]]
        self.assertEqual(len(ids), len(set(ids)))

    def test_same_query_same_result(self) -> None:
        self.assertEqual(self.recommend("さっぱり"), self.recommend("さっぱり"))

    def test_query_required(self) -> None:
        res = self.client.post("/recommendations")
        self.assertEqual(res.status_code, 422)


class TestFeedback(ApiTestCase):
    def test_post(self) -> None:
        res = self.client.post(
            "/feedback",
            json={
                "device_id": "d1",
                "cocktail_id": "mojito",
                "rating": "up",
                "query": "q",
            },
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["id"], 1)
        self.assertEqual(res.json()["rating"], "up")

    def test_unknown_cocktail(self) -> None:
        self.assertEqual(self.feedback("unknown", "up"), 404)

    def test_invalid_rating(self) -> None:
        self.assertEqual(self.feedback("mojito", "good"), 422)


class TestFavorites(ApiTestCase):
    def favorites(self, device_id: str = "d1") -> list[str]:
        res = self.client.get("/favorites", params={"device_id": device_id})
        self.assertEqual(res.status_code, 200)
        return res.json()

    def add(self, cocktail_id: str, device_id: str = "d1") -> int:
        res = self.client.post(
            "/favorites", json={"device_id": device_id, "cocktail_id": cocktail_id}
        )
        return res.status_code

    def test_empty(self) -> None:
        self.assertEqual(self.favorites(), [])

    def test_add_and_remove(self) -> None:
        self.assertEqual(self.add("mojito"), 204)
        self.assertEqual(self.add("gin-tonic"), 204)
        self.assertEqual(self.favorites(), ["gin-tonic", "mojito"])

        res = self.client.delete("/favorites/mojito", params={"device_id": "d1"})
        self.assertEqual(res.status_code, 204)
        self.assertEqual(self.favorites(), ["gin-tonic"])

    def test_add_twice(self) -> None:
        self.add("mojito")
        self.add("mojito")
        self.assertEqual(self.favorites(), ["mojito"])

    def test_separated_by_device(self) -> None:
        self.add("mojito", device_id="d1")
        self.assertEqual(self.favorites("d2"), [])

    def test_remove_not_registered(self) -> None:
        res = self.client.delete("/favorites/mojito", params={"device_id": "d1"})
        self.assertEqual(res.status_code, 204)

    def test_unknown_cocktail(self) -> None:
        self.assertEqual(self.add("unknown"), 404)


class TestStats(ApiTestCase):
    def stats(self) -> dict:
        res = self.client.get("/stats")
        self.assertEqual(res.status_code, 200)
        return res.json()

    def test_empty(self) -> None:
        self.assertEqual(self.stats(), {"cocktails": [], "queries": []})

    def test_feedback_counted(self) -> None:
        self.feedback("mojito", "up")
        self.feedback("mojito", "up", device_id="d2")
        self.feedback("mojito", "down")
        self.feedback("gin-tonic", "up")

        cocktails = self.stats()["cocktails"]
        self.assertEqual(
            [(c["cocktail"]["id"], c["up"], c["down"]) for c in cocktails],
            [("mojito", 2, 1), ("gin-tonic", 1, 0)],
        )

    def test_favorites_counted(self) -> None:
        self.client.post(
            "/favorites", json={"device_id": "d1", "cocktail_id": "mojito"}
        )
        self.client.post(
            "/favorites", json={"device_id": "d2", "cocktail_id": "mojito"}
        )

        cocktails = self.stats()["cocktails"]
        self.assertEqual(cocktails[0]["cocktail"]["id"], "mojito")
        self.assertEqual(cocktails[0]["favorites"], 2)

    def test_queries_counted(self) -> None:
        self.recommend("甘い")
        self.recommend("甘い", with_image=True)
        self.recommend("さっぱり")

        self.assertEqual(
            self.stats()["queries"],
            [{"query": "甘い", "count": 2}, {"query": "さっぱり", "count": 1}],
        )


if __name__ == "__main__":
    unittest.main()
