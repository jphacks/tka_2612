from fastapi import APIRouter, Query

from app import query_log
from app.schemas import QueryCount

router = APIRouter(prefix="/store", tags=["store"])

# クエリで受け取る件数と期間
LIMIT = Query(default=20, ge=1, le=100, description="返す件数（最大100）")
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
