"""メニューの写真の読み取り・位置の API のテスト（Gemini は呼ばずに差し替える）"""

import base64
import unittest
from unittest import mock

import httpx
from fastapi.testclient import TestClient
from google.genai import errors
from google.genai._gaos.lib.compat_errors import RateLimitError
from google.genai.interactions import Interaction

from app import gemini, menu_reader
from app.main import app
from app.routers import menu
from app.schemas import (
    MenuLocateRequest,
    MenuLocateResponse,
    MenuScanItem,
    MenuScanResponse,
)

DATA_URL = "data:image/png;base64," + base64.b64encode(b"png").decode()

LOCATED = [
    MenuScanItem(name="MOJITO", x=25.0, y=10.0),
    MenuScanItem(name="GIN TONIC", x=None, y=None),
]


def rate_limit_error() -> RateLimitError:
    request = httpx.Request("POST", "https://example.com")
    return RateLimitError(
        "Rate limit exceeded", response=httpx.Response(429, request=request), body=None
    )


class GeminiAvailable(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        patcher = mock.patch.object(gemini, "is_available", return_value=True)
        patcher.start()
        self.addCleanup(patcher.stop)


class TestMenuScan(GeminiAvailable):
    def setUp(self) -> None:
        super().setUp()
        patcher = mock.patch.object(
            menu_reader, "read_names", return_value=["MOJITO", "GIN TONIC"]
        )
        self.read = patcher.start()
        self.addCleanup(patcher.stop)

    def scan(self, data: bytes = b"png", mime_type: str = "image/png") -> int:
        res = self.client.post(
            "/menu/scan", files={"image": ("menu.png", data, mime_type)}
        )
        self.last_text = res.text
        return res.status_code

    def test_returns_names(self) -> None:
        self.assertEqual(self.scan(), 200)
        self.assertEqual(
            MenuScanResponse.model_validate_json(self.last_text),
            MenuScanResponse(names=["MOJITO", "GIN TONIC"]),
        )
        self.read.assert_called_once_with(b"png", "image/png")

    def test_not_image(self) -> None:
        self.assertEqual(self.scan(mime_type="text/plain"), 415)
        self.read.assert_not_called()

    def test_too_large(self) -> None:
        with mock.patch.object(menu, "MAX_IMAGE_BYTES", 3):
            self.assertEqual(self.scan(data=b"1234"), 413)
        self.read.assert_not_called()

    def test_api_key_missing(self) -> None:
        with mock.patch.object(gemini, "is_available", return_value=False):
            self.assertEqual(self.scan(), 503)

    def test_gemini_error(self) -> None:
        self.read.side_effect = errors.ClientError(
            429, {"error": {"code": 429, "status": "RESOURCE_EXHAUSTED"}}
        )
        self.assertEqual(self.scan(), 503)

    def test_interactions_rate_limit(self) -> None:
        # 写真の読み取りで使う interactions API は、google.genai.errors とは別系統の例外を投げる
        self.read.side_effect = rate_limit_error()
        self.assertEqual(self.scan(), 503)

    def test_image_required(self) -> None:
        self.assertEqual(self.client.post("/menu/scan").status_code, 422)


class TestMenuLocate(GeminiAvailable):
    def setUp(self) -> None:
        super().setUp()
        patcher = mock.patch.object(menu_reader, "locate", return_value=LOCATED)
        self.locate = patcher.start()
        self.addCleanup(patcher.stop)

    def post(self, names: list[str], image: str = DATA_URL) -> int:
        req = MenuLocateRequest.model_construct(image=image, names=names)
        res = self.client.post(
            "/menu/locate",
            content=req.model_dump_json(),
            headers={"Content-Type": "application/json"},
        )
        self.last_text = res.text
        return res.status_code

    def test_returns_positions(self) -> None:
        self.assertEqual(self.post(["MOJITO", "GIN TONIC"]), 200)
        self.assertEqual(
            MenuLocateResponse.model_validate_json(self.last_text),
            MenuLocateResponse(items=LOCATED),
        )
        self.locate.assert_called_once_with(
            b"png", "image/png", ["MOJITO", "GIN TONIC"]
        )

    def test_names_required(self) -> None:
        self.assertEqual(self.post([]), 422)
        self.locate.assert_not_called()

    def test_not_image(self) -> None:
        text = "data:text/plain;base64," + base64.b64encode(b"hi").decode()
        self.assertEqual(self.post(["MOJITO"], image=text), 415)
        self.assertEqual(self.post(["MOJITO"], image="not a data url"), 415)
        self.assertEqual(self.post(["MOJITO"], image="data:image/png;base64,@@"), 415)
        self.locate.assert_not_called()

    def test_too_large(self) -> None:
        with mock.patch.object(menu, "MAX_IMAGE_BYTES", 2):
            self.assertEqual(self.post(["MOJITO"]), 413)
        self.locate.assert_not_called()

    def test_too_many_names(self) -> None:
        self.assertEqual(self.post([f"お酒{i}" for i in range(11)]), 422)
        self.locate.assert_not_called()

    def test_gemini_error(self) -> None:
        self.locate.side_effect = rate_limit_error()
        self.assertEqual(self.post(["MOJITO"]), 503)


def fake_client(output_text: str) -> mock.Mock:
    fake = mock.Mock()
    fake.interactions.create.return_value = mock.Mock(
        spec=Interaction, output_text=output_text
    )
    return fake


class TestReadNames(unittest.TestCase):
    """Gemini の返事から名前を取り出す部分"""

    def read(self, output_text: str) -> list[str]:
        with mock.patch.object(gemini, "client", return_value=fake_client(output_text)):
            return menu_reader.read_names(b"png", "image/png")

    def test_strips_and_dedupes(self) -> None:
        names = self.read('{"names": [" MOJITO ", "GIN TONIC", "MOJITO", ""]}')
        self.assertEqual(names, ["MOJITO", "GIN TONIC"])

    def test_empty(self) -> None:
        self.assertEqual(self.read('{"names": []}'), [])

    def test_fast_settings(self) -> None:
        fake = fake_client('{"names": []}')
        with mock.patch.object(gemini, "client", return_value=fake):
            menu_reader.read_names(b"png", "image/png")
        kwargs = fake.interactions.create.call_args.kwargs
        self.assertEqual(kwargs["model"], "gemini-3.5-flash-lite")
        self.assertEqual(kwargs["generation_config"], {"thinking_level": "minimal"})


class TestLocate(unittest.TestCase):
    """Gemini の返事から、指定した名前の位置を取り出す部分"""

    def locate(self, names: list[str], output_text: str) -> list[MenuScanItem]:
        with mock.patch.object(gemini, "client", return_value=fake_client(output_text)):
            return menu_reader.locate(b"png", "image/png", names)

    def test_center_position_in_percent(self) -> None:
        items = self.locate(
            ["MOJITO"],
            '{"drinks": [{"name": "MOJITO", "box_2d": [100, 200, 140, 400]}]}',
        )
        self.assertEqual(items, [MenuScanItem(name="MOJITO", x=30.0, y=12.0)])

    def test_keeps_requested_order_and_names(self) -> None:
        # Gemini が順番や表記を変えて返しても、指定した順・指定した名前で返す
        items = self.locate(
            ["カシス・オレンジ", "モヒート"],
            '{"drinks": [{"name": "モヒート", "box_2d": [0, 0, 100, 100]},'
            ' {"name": "カシスオレンジ", "box_2d": [500, 500, 600, 600]}]}',
        )
        self.assertEqual(
            items,
            [
                MenuScanItem(name="カシス・オレンジ", x=55.0, y=55.0),
                MenuScanItem(name="モヒート", x=5.0, y=5.0),
            ],
        )

    def test_not_found_has_no_position(self) -> None:
        items = self.locate(
            ["A", "B", "C"],
            '{"drinks": [{"name": "A", "box_2d": []},'
            ' {"name": "B", "box_2d": [500, 500, 100, 100]}]}',
        )
        self.assertEqual(
            [(i.name, i.x, i.y) for i in items], [(n, None, None) for n in "ABC"]
        )

    def test_no_names_does_not_call_gemini(self) -> None:
        fake = fake_client('{"drinks": []}')
        with mock.patch.object(gemini, "client", return_value=fake):
            self.assertEqual(menu_reader.locate(b"png", "image/png", []), [])
        fake.interactions.create.assert_not_called()


class TestCors(unittest.TestCase):
    def test_frontend_origin_allowed(self) -> None:
        res = TestClient(app).get(
            "/health", headers={"Origin": "http://localhost:5173"}
        )
        self.assertEqual(
            res.headers.get("access-control-allow-origin"), "http://localhost:5173"
        )

    def test_other_origin_not_allowed(self) -> None:
        res = TestClient(app).get("/health", headers={"Origin": "https://evil.example"})
        self.assertIsNone(res.headers.get("access-control-allow-origin"))


if __name__ == "__main__":
    unittest.main()
