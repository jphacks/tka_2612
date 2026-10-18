"""メニューの写真の読み取り API のテスト（Gemini は呼ばずに差し替える）"""

import unittest
from unittest import mock

from fastapi.testclient import TestClient
from google.genai import errors
from google.genai.interactions import Interaction

from app import gemini, menu_reader
from app.main import app
from app.routers import menu
from app.schemas import MenuScanItem, MenuScanResponse

ITEMS = [
    MenuScanItem(name="MOJITO", x=25.0, y=10.0),
    MenuScanItem(name="GIN TONIC", x=None, y=None),
]


class TestMenuScan(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        patcher = mock.patch.object(gemini, "is_available", return_value=True)
        patcher.start()
        self.addCleanup(patcher.stop)
        patcher = mock.patch.object(menu_reader, "read_menu", return_value=ITEMS)
        self.read = patcher.start()
        self.addCleanup(patcher.stop)

    def scan(self, data: bytes = b"png", mime_type: str = "image/png") -> int:
        res = self.client.post(
            "/menu/scan", files={"image": ("menu.png", data, mime_type)}
        )
        self.last_text = res.text
        return res.status_code

    def test_returns_items(self) -> None:
        self.assertEqual(self.scan(), 200)
        self.assertEqual(
            MenuScanResponse.model_validate_json(self.last_text),
            MenuScanResponse(items=ITEMS),
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

    def test_image_required(self) -> None:
        self.assertEqual(self.client.post("/menu/scan").status_code, 422)


class TestReadMenu(unittest.TestCase):
    """Gemini の返事から、名前と位置を取り出す部分"""

    def read(self, output_text: str) -> list[MenuScanItem]:
        fake = mock.Mock()
        fake.interactions.create.return_value = mock.Mock(
            spec=Interaction, output_text=output_text
        )
        with mock.patch.object(gemini, "client", return_value=fake):
            return menu_reader.read_menu(b"png", "image/png")

    def test_center_position_in_percent(self) -> None:
        items = self.read(
            '{"drinks": [{"name": " MOJITO ", "box_2d": [100, 200, 140, 400]}]}'
        )
        self.assertEqual(items, [MenuScanItem(name="MOJITO", x=30.0, y=12.0)])

    def test_invalid_box_has_no_position(self) -> None:
        items = self.read(
            '{"drinks": [{"name": "A", "box_2d": [1, 2, 3]},'
            ' {"name": "B", "box_2d": [500, 500, 100, 100]},'
            ' {"name": "C", "box_2d": [0, 0, 2000, 10]}]}'
        )
        self.assertEqual([(i.x, i.y) for i in items], [(None, None)] * 3)

    def test_dedupes_and_skips_blank(self) -> None:
        box = "[0, 0, 10, 10]"
        items = self.read(
            '{"drinks": ['
            f'{{"name": "MOJITO", "box_2d": {box}}},'
            f'{{"name": "", "box_2d": {box}}},'
            f'{{"name": "MOJITO", "box_2d": {box}}}]}}'
        )
        self.assertEqual([i.name for i in items], ["MOJITO"])

    def test_empty(self) -> None:
        self.assertEqual(self.read('{"drinks": []}'), [])

    def test_thinking_level_minimal(self) -> None:
        fake = mock.Mock()
        fake.interactions.create.return_value = mock.Mock(
            spec=Interaction, output_text='{"drinks": []}'
        )
        with mock.patch.object(gemini, "client", return_value=fake):
            menu_reader.read_menu(b"png", "image/png")
        self.assertEqual(
            fake.interactions.create.call_args.kwargs["generation_config"],
            {"thinking_level": "minimal"},
        )


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
