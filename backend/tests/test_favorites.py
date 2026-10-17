"""お気に入り API のテスト（テストごとに一時的な SQLite ファイルを使う）"""

import os
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from app import db
from app.main import app
from app.schemas import Cocktail, FavoriteCount, FavoriteRequest, FavoriteStatus

COCKTAIL_LIST = TypeAdapter(list[Cocktail])
COUNT_LIST = TypeAdapter(list[FavoriteCount])


class FavoritesTestCase(unittest.TestCase):
    def setUp(self) -> None:
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.db_path = Path(tmp.name) / "test.db"
        patcher = mock.patch.dict(os.environ, {"DATABASE_PATH": str(self.db_path)})
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client = TestClient(app)

    def add(self, cocktail_id: str, device_id: str = "d1") -> FavoriteStatus:
        req = FavoriteRequest(device_id=device_id, cocktail_id=cocktail_id)
        res = self.client.post(
            "/favorites",
            content=req.model_dump_json(),
            headers={"Content-Type": "application/json"},
        )
        self.assertEqual(res.status_code, 200, res.text)
        return FavoriteStatus.model_validate_json(res.text)

    def remove(self, cocktail_id: str, device_id: str = "d1") -> FavoriteStatus:
        res = self.client.delete(
            f"/favorites/{cocktail_id}", params={"device_id": device_id}
        )
        self.assertEqual(res.status_code, 200, res.text)
        return FavoriteStatus.model_validate_json(res.text)

    def favorites(self, device_id: str = "d1") -> list[str]:
        res = self.client.get("/favorites", params={"device_id": device_id})
        self.assertEqual(res.status_code, 200)
        return [c.id for c in COCKTAIL_LIST.validate_json(res.text)]

    def counts(self) -> list[tuple[str, int]]:
        res = self.client.get("/favorites/counts")
        self.assertEqual(res.status_code, 200)
        return [
            (c.cocktail.id, c.favorite_count)
            for c in COUNT_LIST.validate_json(res.text)
        ]


class TestFavorites(FavoritesTestCase):
    def test_empty(self) -> None:
        self.assertEqual(self.favorites(), [])
        self.assertEqual(self.counts(), [])

    def test_add(self) -> None:
        body = self.add("mojito")
        self.assertEqual(
            body,
            FavoriteStatus(cocktail_id="mojito", favorited=True, favorite_count=1),
        )
        self.assertEqual(self.favorites(), ["mojito"])

    def test_newest_first(self) -> None:
        self.add("mojito")
        self.add("margarita")
        self.assertEqual(self.favorites(), ["margarita", "mojito"])

    def test_add_twice_counts_once(self) -> None:
        self.add("mojito")
        self.assertEqual(self.add("mojito").favorite_count, 1)
        self.assertEqual(self.favorites(), ["mojito"])

    def test_remove(self) -> None:
        self.add("mojito")
        body = self.remove("mojito")
        self.assertEqual(
            body,
            FavoriteStatus(cocktail_id="mojito", favorited=False, favorite_count=0),
        )
        self.assertEqual(self.favorites(), [])

    def test_remove_not_registered(self) -> None:
        self.add("mojito", device_id="d2")
        self.assertEqual(self.remove("mojito").favorite_count, 1)

    def test_separated_by_device(self) -> None:
        self.add("mojito", device_id="d1")
        self.assertEqual(self.favorites("d2"), [])

    def test_unknown_cocktail(self) -> None:
        res = self.client.post(
            "/favorites", json={"device_id": "d1", "cocktail_id": "unknown"}
        )
        self.assertEqual(res.status_code, 404)
        res = self.client.delete("/favorites/unknown", params={"device_id": "d1"})
        self.assertEqual(res.status_code, 404)

    def test_device_id_required(self) -> None:
        res = self.client.post(
            "/favorites", json={"device_id": "", "cocktail_id": "mojito"}
        )
        self.assertEqual(res.status_code, 422)
        self.assertEqual(self.client.get("/favorites").status_code, 422)


class TestFavoriteCounts(FavoritesTestCase):
    def test_total_across_devices(self) -> None:
        self.add("mojito", device_id="d1")
        self.add("mojito", device_id="d2")
        self.add("margarita", device_id="d1")
        self.assertEqual(self.add("mojito", device_id="d3").favorite_count, 3)
        self.assertEqual(self.counts(), [("mojito", 3), ("margarita", 1)])

    def test_count_decreases_on_remove(self) -> None:
        self.add("mojito", device_id="d1")
        self.add("mojito", device_id="d2")
        self.remove("mojito", device_id="d1")
        self.assertEqual(self.counts(), [("mojito", 1)])

    def test_zero_not_listed(self) -> None:
        self.add("mojito")
        self.remove("mojito")
        self.assertEqual(self.counts(), [])

    def test_saved_in_database(self) -> None:
        self.add("mojito", device_id="d1")
        self.add("mojito", device_id="d2")
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                "SELECT count FROM favorite_counts WHERE cocktail_id = 'mojito'"
            ).fetchone()
        self.assertEqual(row[0], 2)

    def test_database_path_from_env(self) -> None:
        self.assertEqual(db.database_path(), self.db_path)


if __name__ == "__main__":
    unittest.main()
