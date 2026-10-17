"""API のリクエスト・レスポンスの型"""

from pydantic import BaseModel, Field


class Cocktail(BaseModel):
    """お酒の情報（ベクトルは API では返さない）"""

    id: str = Field(description="お酒のID")
    name: str = Field(description="お酒の名前（日本語）")
    aliases: list[str] = Field(description="照合用の別名（英名・表記ゆれなど）")
    description: str = Field(description="味・香り、度数の目安、合う場面・気分の説明文")
    ingredients: list[str] = Field(description="材料")


class MenuMatchRequest(BaseModel):
    """メニューに載っているお酒の名前"""

    names: list[str] = Field(
        max_length=200,
        description="メニューから読み取ったお酒の名前（価格などが付いていてもよい）",
    )


class MatchedCocktail(BaseModel):
    """データベースのお酒と一致した名前"""

    name: str = Field(description="メニューに書かれていた名前")
    cocktail: Cocktail


class MenuMatchResponse(BaseModel):
    """照合の結果"""

    matched: list[MatchedCocktail] = Field(
        description="データベースのお酒と一致したもの"
    )
    unregistered: list[str] = Field(description="データベースにないお酒の名前")


class RecommendRequest(BaseModel):
    """おすすめのリクエスト"""

    query: str = Field(
        min_length=1,
        max_length=500,
        description="味の希望や、シーン・気分を表す文（例: 甘くてフルーティ、失恋を支えてくれるお酒）",
    )
    cocktail_ids: list[str] | None = Field(
        default=None,
        max_length=200,
        description="候補にするお酒のID（メニューの写真から照合したものなど）。省略するとデータベース全体から選ぶ",
    )


class Recommendation(BaseModel):
    """おすすめ1件"""

    cocktail: Cocktail
    score: float = Field(description="一致度（入力文とお酒の説明文のコサイン類似度）")


class RecommendResponse(BaseModel):
    """おすすめの結果"""

    query: str = Field(description="入力文")
    recommendations: list[Recommendation] = Field(
        description="一致度の高い順のおすすめ（上位5件まで）"
    )
