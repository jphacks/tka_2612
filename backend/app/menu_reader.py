"""メニューの写真を Gemini で読む

読み取りを速くするため、2段階に分ける。
1. read_names: 載っているお酒の名前だけを読み取る（位置は求めないので速い）
2. locate: おすすめが決まったお酒について、その名前が書かれている位置だけを求める
"""

import base64

from google.genai.interactions import Interaction
from pydantic import BaseModel, Field

from app import gemini
from app.menu_matching import normalize
from app.schemas import MenuScanItem

# 画像を読めるモデル。https://ai.google.dev/gemini-api/docs/models
# 軽くて速い flash-lite を使う（gemini-3.8-flash は無料枠が1日20回しかなく、デモで足りないため）
MODEL = "gemini-3.5-flash-lite"

# 思考の量。文字を読み取るだけなので、いちばん少ない minimal にして応答を速くする
# （gemini-3.5-flash-lite で選べるのは minimal・low・medium・high）
THINKING_LEVEL = "minimal"

NAMES_PROMPT = (
    "この画像は飲食店のメニューです。"
    "載っているお酒・カクテル（ノンアルコールカクテルを含む）の名前を、書かれている表記のまますべて抜き出してください。"
    "価格・説明・料理・見出しは含めないでください。"
    "メニューでない画像や、お酒が載っていない場合は空の一覧を返してください。"
)

LOCATE_PROMPT = (
    "この画像は飲食店のメニューです。"
    "次のお酒の名前がメニューのどこに書かれているかを、それぞれ box_2d で返してください。"
    "box_2d は [ymin, xmin, ymax, xmax] で、0〜1000 に正規化した値です。"
    "見つからない名前は box_2d を空の一覧にしてください。\n"
)


class _MenuNames(BaseModel):
    names: list[str] = Field(description="メニューに載っているお酒の名前")


class _Located(BaseModel):
    name: str = Field(description="お酒の名前（指定されたとおり）")
    box_2d: list[int] = Field(
        description="名前が書かれている位置。[ymin, xmin, ymax, xmax] を 0〜1000 に正規化した値。見つからなければ空"
    )


class _LocatedList(BaseModel):
    drinks: list[_Located] = Field(description="指定されたお酒の位置")


def _ask(
    prompt: str, image: bytes, mime_type: str, schema: dict[str, object]
) -> str | None:
    """写真と指示を Gemini に渡し、JSON の文字列を受け取る"""
    interaction = gemini.client().interactions.create(
        model=MODEL,
        input=[
            {"type": "text", "text": prompt},
            {
                "type": "image",
                "data": base64.b64encode(image).decode(),
                "mime_type": mime_type,
            },
        ],
        response_format={
            "type": "text",
            "mime_type": "application/json",
            "schema": schema,
        },
        generation_config={"thinking_level": THINKING_LEVEL},
    )
    # stream を指定していないので、ストリームではなく完了した結果が返る
    if not isinstance(interaction, Interaction):
        return None
    return interaction.output_text


def read_names(image: bytes, mime_type: str) -> list[str]:
    """メニューの写真に載っているお酒の名前を、載っている順に返す（同じ名前は1回だけ）"""
    text = _ask(NAMES_PROMPT, image, mime_type, _MenuNames.model_json_schema())
    if text is None:
        return []
    names = _MenuNames.model_validate_json(text).names
    return list(dict.fromkeys(n.strip() for n in names if n.strip()))


def _center_percent(box: list[int]) -> tuple[float | None, float | None]:
    """box_2d（0〜1000）から、名前の中心の位置を写真の幅・高さに対する % で返す"""
    if len(box) != 4:
        return None, None
    ymin, xmin, ymax, xmax = box
    if not (0 <= ymin <= ymax <= 1000 and 0 <= xmin <= xmax <= 1000):
        return None, None
    return (xmin + xmax) / 20, (ymin + ymax) / 20


def locate(image: bytes, mime_type: str, names: list[str]) -> list[MenuScanItem]:
    """指定したお酒の名前が書かれている位置を、指定した順に返す（見つからなければ null）"""
    if not names:
        return []
    prompt = LOCATE_PROMPT + "\n".join(f"- {name}" for name in names)
    text = _ask(prompt, image, mime_type, _LocatedList.model_json_schema())
    boxes: dict[str, list[int]] = {}
    if text is not None:
        for drink in _LocatedList.model_validate_json(text).drinks:
            # Gemini が表記を少し変えて返すことがあるので、表記ゆれをそろえて対応づける
            boxes.setdefault(normalize(drink.name), drink.box_2d)

    items: list[MenuScanItem] = []
    for name in names:
        x, y = _center_percent(boxes.get(normalize(name), []))
        items.append(MenuScanItem(name=name, x=x, y=y))
    return items
