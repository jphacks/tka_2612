"""API のリクエスト・レスポンスの型"""

from pydantic import BaseModel, Field


class Cocktail(BaseModel):
    """お酒の情報（ベクトルは API では返さない）"""

    id: str = Field(description="お酒のID")
    name: str = Field(description="お酒の名前（日本語）")
    aliases: list[str] = Field(description="照合用の別名（英名・表記ゆれなど）")
    description: str = Field(description="味・香り、度数の目安、合う場面・気分の説明文")
    ingredients: list[str] = Field(description="材料")
