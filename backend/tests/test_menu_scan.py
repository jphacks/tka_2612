"""メニューの写真の読み取り API のテスト（Gemini は呼ばずに差し替える）"""

import unittest
from unittest import mock

from fastapi.testclient import TestClient
from google.genai import errors
from google.genai.interactions import Interaction

from app import gemini, menu_reader
from app.main import app
from app.routers import menu


class TestMenuScan(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        patcher = mock.patch.object(gemini, "is_available", return_value=True)
        patcher.start()
        self.addCleanup(patcher.stop)
        patcher = mock.patch.object(
            menu_reader, "read_drink_names", return_value=["MOJITO", "GIN TONIC"]
        )
        self.read = patcher.start()
        self.addCleanup(patcher.stop)

    def scan(self, data: bytes = b"png", mime_type: str = "image/png"):
        return self.client.post(
            "/menu/scan", files={"image": ("menu.png", data, mime_type)}
        )

    def test_returns_names(self) -> None:
        res = self.scan()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"names": ["MOJITO", "GIN TONIC"]})
        self.read.assert_called_once_with(b"png", "image/png")

    def test_not_image(self) -> None:
        self.assertEqual(self.scan(mime_type="text/plain").status_code, 415)
        self.read.assert_not_called()

    def test_too_large(self) -> None:
        with mock.patch.object(menu, "MAX_IMAGE_BYTES", 3):
            self.assertEqual(self.scan(data=b"1234").status_code, 413)
        self.read.assert_not_called()

    def test_api_key_missing(self) -> None:
        with mock.patch.object(gemini, "is_available", return_value=False):
            self.assertEqual(self.scan().status_code, 503)

    def test_gemini_error(self) -> None:
        self.read.side_effect = errors.ClientError(
            429, {"error": {"code": 429, "status": "RESOURCE_EXHAUSTED"}}
        )
        self.assertEqual(self.scan().status_code, 503)

    def test_image_required(self) -> None:
        self.assertEqual(self.client.post("/menu/scan").status_code, 422)


class TestReadDrinkNames(unittest.TestCase):
    """Gemini の返事から名前の一覧を取り出す部分"""

    def read(self, output_text: str) -> list[str]:
        fake = mock.Mock()
        fake.interactions.create.return_value = mock.Mock(
            spec=Interaction, output_text=output_text
        )
        with mock.patch.object(gemini, "client", return_value=fake):
            return menu_reader.read_drink_names(b"png", "image/png")

    def test_strips_and_dedupes(self) -> None:
        names = self.read('{"names": [" MOJITO ", "GIN TONIC", "MOJITO", ""]}')
        self.assertEqual(names, ["MOJITO", "GIN TONIC"])

    def test_empty(self) -> None:
        self.assertEqual(self.read('{"names": []}'), [])


if __name__ == "__main__":
    unittest.main()
