"""API のリクエスト・レスポンスの型"""

from typing import Literal

from pydantic import BaseModel, Field


class Cocktail(BaseModel):
    """お酒の情報（ベクトルは API では返さない）"""

    id: str = Field(description="お酒のID")
    name: str = Field(description="お酒の名前（日本語）")
    aliases: list[str] = Field(description="照合用の別名（英名・カタカナ名など）")
    description: str = Field(description="味・香り・材料の説明文")
    ingredients: list[str] = Field(description="材料")


class Recommendation(BaseModel):
    """おすすめ1件"""

    cocktail: Cocktail
    score: float = Field(description="一致度（コサイン類似度）")


class RecommendResponse(BaseModel):
    """おすすめの結果"""

    query: str = Field(description="ユーザーが入力した好み")
    recommendations: list[Recommendation] = Field(
        description="一致度の高い順のおすすめ（上位5件まで）"
    )
    unregistered: list[str] = Field(
        description="写真から読み取れたが未登録のお酒の名前。写真なしのときは空"
    )


Rating = Literal["up", "down"]


class FeedbackRequest(BaseModel):
    """推薦結果へのフィードバック"""

    device_id: str = Field(description="ブラウザごとのランダムな端末ID")
    cocktail_id: str = Field(description="お酒のID")
    rating: Rating = Field(description="👍 は up、👎 は down")
    query: str = Field(description="推薦時に入力した好み")


class Feedback(FeedbackRequest):
    """保存されたフィードバック"""

    id: int


class FavoriteRequest(BaseModel):
    """お気に入りの登録"""

    device_id: str = Field(description="ブラウザごとのランダムな端末ID")
    cocktail_id: str = Field(description="お酒のID")


class CocktailStats(BaseModel):
    """お酒ごとの集計"""

    cocktail: Cocktail
    up: int = Field(description="👍 の数")
    down: int = Field(description="👎 の数")
    favorites: int = Field(description="お気に入り登録数")


class QueryStats(BaseModel):
    """よく求められた味（入力文）の集計"""

    query: str
    count: int


class StoreStats(BaseModel):
    """店舗向けの集計"""

    cocktails: list[CocktailStats] = Field(description="👍 の多い順")
    queries: list[QueryStats] = Field(description="入力回数の多い順")
