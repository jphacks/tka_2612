"""メニューの写真から、お酒の名前と写真上の位置を Gemini で読み取る"""

import base64

from google.genai.interactions import Interaction
from pydantic import BaseModel, Field

from app import gemini
from app.schemas import MenuScanItem

# 画像を読めるモデル。https://ai.google.dev/gemini-api/docs/models
MODEL = "gemini-3.8-flash"

PROMPT = (
    "この画像は飲食店のメニューです。"
    "載っているお酒・カクテル（ノンアルコールカクテルを含む）の名前を、書かれている表記のまますべて抜き出してください。"
    "価格・説明・料理・見出しは含めないでください。"
    "それぞれの名前が書かれている位置を box_2d として返してください。"
    "box_2d は [ymin, xmin, ymax, xmax] で、0〜1000 に正規化した値です。"
    "メニューでない画像や、お酒が載っていない場合は空の一覧を返してください。"
)


class _MenuDrink(BaseModel):
    name: str = Field(description="メニューに書かれているお酒の名前")
    box_2d: list[int] = Field(
        description="名前が書かれている位置。[ymin, xmin, ymax, xmax] を 0〜1000 に正規化した値"
    )


class _MenuDrinks(BaseModel):
    drinks: list[_MenuDrink] = Field(description="メニューに載っているお酒")


def _center_percent(box: list[int]) -> tuple[float | None, float | None]:
    """box_2d（0〜1000）から、名前の中心の位置を写真の幅・高さに対する % で返す"""
    if len(box) != 4:
        return None, None
    ymin, xmin, ymax, xmax = box
    if not (0 <= ymin <= ymax <= 1000 and 0 <= xmin <= xmax <= 1000):
        return None, None
    return (xmin + xmax) / 20, (ymin + ymax) / 20


def read_menu(image: bytes, mime_type: str) -> list[MenuScanItem]:
    """メニューの写真に載っているお酒を、載っている順に返す（同じ名前は最初の1件だけ）"""
    interaction = gemini.client().interactions.create(
        model=MODEL,
        input=[
            {"type": "text", "text": PROMPT},
            {
                "type": "image",
                "data": base64.b64encode(image).decode(),
                "mime_type": mime_type,
            },
        ],
        response_format={
            "type": "text",
            "mime_type": "application/json",
            "schema": _MenuDrinks.model_json_schema(),
        },
    )
    # stream を指定していないので、ストリームではなく完了した結果が返る
    if not isinstance(interaction, Interaction) or interaction.output_text is None:
        return []

    items: list[MenuScanItem] = []
    seen: set[str] = set()
    for drink in _MenuDrinks.model_validate_json(interaction.output_text).drinks:
        name = drink.name.strip()
        if not name or name in seen:
            continue
        seen.add(name)
        x, y = _center_percent(drink.box_2d)
        items.append(MenuScanItem(name=name, x=x, y=y))
    return items
