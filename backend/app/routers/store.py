from fastapi import APIRouter, Query

from app import keywords, query_log
from app.schemas import KeywordCount, QueryCount

router = APIRouter(prefix="/store", tags=["store"])

# クエリで受け取る件数と期間
LIMIT = Query(default=20, ge=1, le=100, description="返す件数（最大100）")
KEYWORD_LIMIT = Query(default=50, ge=1, le=200, description="返す言葉の数（最大200）")
DAYS = Query(
    default=None,
    ge=1,
    le=365,
    description="直近何日分を数えるか。省略するとすべての期間",
)


@router.get("/queries")
def list_popular_queries(
    limit: int = LIMIT, days: int | None = DAYS
) -> list[QueryCount]:
    """よく求められた味（おすすめで入力された文）を、回数の多い順に返す

    店舗向けの集計。全角半角と空白の違いはそろえて数える。回数が同じなら最近入力された順。
    """
    return [QueryCount(query=q, count=n) for q, n in query_log.ranking(limit, days)]


@router.get("/keywords")
def list_popular_keywords(
    limit: int = KEYWORD_LIMIT, days: int | None = DAYS
) -> list[KeywordCount]:
    """検索履歴でよく使われた言葉を、回数の多い順に返す（ワードクラウド・ランキング用）

    おすすめで入力された文を単語に分け、意味のある言葉（名詞・形容詞・副詞・動詞）だけを数える。
    「お酒」「飲む」のように好みの手がかりにならない言葉は除く。
    `count` はその言葉を含む検索の回数、`weight` はいちばん多い言葉を 1 とした割合。
    """
    ranked = keywords.ranking(limit, days)
    top = ranked[0][1] if ranked else 1
    return [KeywordCount(word=w, count=n, weight=round(n / top, 3)) for w, n in ranked]
