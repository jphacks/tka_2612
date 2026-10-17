"""メニューの写真から、お酒の名前を Gemini で読み取る"""

import base64

from google.genai.interactions import Interaction
from pydantic import BaseModel, Field

from app import gemini

# 画像を読めるモデル。https://ai.google.dev/gemini-api/docs/models
MODEL = "gemini-3.8-flash"

PROMPT = (
    "この画像は飲食店のメニューです。"
    "載っているお酒・カクテル（ノンアルコールカクテルを含む）の名前を、書かれている表記のまますべて抜き出してください。"
    "価格・説明・料理・見出しは含めないでください。"
    "メニューでない画像や、お酒が載っていない場合は空の一覧を返してください。"
)


class _MenuDrinks(BaseModel):
    names: list[str] = Field(description="メニューに載っているお酒の名前")


def read_drink_names(image: bytes, mime_type: str) -> list[str]:
    """メニューの写真に載っているお酒の名前を、載っている順に返す（重複は除く）"""
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
    names = _MenuDrinks.model_validate_json(interaction.output_text).names
    return list(dict.fromkeys(n.strip() for n in names if n.strip()))
