"""API のリクエスト・レスポンスの型"""

from pydantic import BaseModel, Field


class Cocktail(BaseModel):
    """お酒の情報（ベクトルは API では返さない）"""

    id: str = Field(description="お酒のID")
    name: str = Field(description="お酒の名前（日本語）")
    aliases: list[str] = Field(description="照合用の別名（英名・表記ゆれなど）")
    description: str = Field(description="味・香り、度数の目安、合う場面・気分の説明文")
    ingredients: list[str] = Field(description="材料")
    bases: list[str] = Field(
        description="ベースのお酒のID（ジン・ラムなど。複数のこともある。ノンアルコールは空）"
    )


class BaseSpirit(BaseModel):
    """カクテルのベースになるお酒（ジン・ラム・ウォッカなど）"""

    id: str = Field(description="ベースのID（gin、rum など）")
    name: str = Field(description="ベースの名前（日本語）")
    aliases: list[str] = Field(description="別名（英名・表記ゆれなど）")
    description: str = Field(description="味・香り、合う場面の説明文")


class CocktailVector(BaseModel):
    """お酒の説明文の埋め込みベクトル"""

    id: str = Field(description="お酒のID")
    vector: list[float] = Field(
        description="説明文の埋め込みベクトル（gemini-embedding-2、768次元）"
    )


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


class FavoriteRequest(BaseModel):
    """お気に入りの登録"""

    device_id: str = Field(
        min_length=1, max_length=100, description="ブラウザごとのランダムな端末ID"
    )
    cocktail_id: str = Field(description="お酒のID")


class FavoriteStatus(BaseModel):
    """お気に入りの登録・解除の結果"""

    cocktail_id: str = Field(description="お酒のID")
    favorited: bool = Field(description="この端末でお気に入りに登録されているか")
    favorite_count: int = Field(description="このお酒のお気に入りの総数（全端末）")


class FavoriteCount(BaseModel):
    """お酒ごとのお気に入りの総数"""

    cocktail: Cocktail
    favorite_count: int = Field(description="お気に入りの総数（全端末）")


class QueryCount(BaseModel):
    """よく求められた味（入力文）と回数"""

    query: str = Field(description="入力文（全角半角と空白の違いはそろえてある）")
    count: int = Field(description="入力された回数")


class SearchRequest(BaseModel):
    """お酒の検索のリクエスト"""

    text: str = Field(
        min_length=1,
        max_length=500,
        description="検索する文（味・香り・気分・シーンなど、自由な文章）",
    )


class SimilarCocktail(BaseModel):
    """検索結果の1件"""

    cocktail: Cocktail
    score: float = Field(description="一致度（入力文とお酒の説明文のコサイン類似度）")


class SearchResponse(BaseModel):
    """お酒の検索の結果"""

    text: str = Field(description="検索した文")
    results: list[SimilarCocktail] = Field(
        description="ベクトルが近い順（一致度の高い順）のお酒（100件）"
    )


class MenuScanItem(BaseModel):
    """メニューの写真上の、お酒の名前の位置"""

    name: str = Field(description="メニューに書かれているお酒の名前")
    x: float | None = Field(
        description="名前の中心の横位置（写真の幅に対する %、0〜100）。読み取れなかったときは null"
    )
    y: float | None = Field(
        description="名前の中心の縦位置（写真の高さに対する %、0〜100）。読み取れなかったときは null"
    )


class MenuScanResponse(BaseModel):
    """メニューの写真から読み取った結果"""

    names: list[str] = Field(
        description="メニューに載っているお酒の名前（載っている順、同じ名前は1件）"
    )


class MenuLocateRequest(BaseModel):
    """メニューの写真上の位置を求めるリクエスト"""

    image: str = Field(
        description="メニューの写真の data URL（例: data:image/jpeg;base64,...）"
    )
    names: list[str] = Field(
        min_length=1,
        max_length=10,
        description="位置を求めるお酒の名前（メニューに書かれていたとおり。10件まで）",
    )


class MenuLocateResponse(BaseModel):
    """メニューの写真上の、指定したお酒の位置"""

    items: list[MenuScanItem] = Field(
        description="指定したお酒の位置（指定した順。見つからなければ x・y が null）"
    )
