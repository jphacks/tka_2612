from fastapi import APIRouter, HTTPException

from app import gemini, query_log, similarity
from app.cocktail_db import COCKTAILS, COCKTAILS_BY_ID
from app.schemas import Recommendation, RecommendRequest, RecommendResponse

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

TOP_N = 5


@router.post(
    "",
    responses={
        422: {"description": "存在しないお酒のIDが含まれている"},
        **gemini.UNAVAILABLE_RESPONSE,
    },
)
def recommend(req: RecommendRequest) -> RecommendResponse:
    """入力文（味の希望や気分）に合うお酒を、一致度の高い順に上位5件返す

    `cocktail_ids` を渡すと、その中からだけ選ぶ（メニューの写真から照合したお酒など）。
    省略すると、データベース全体から選ぶ。一致度は入力文とお酒の説明文のコサイン類似度。
    おすすめを返せたときは、入力文を店舗向けの集計のために記録する（誰が入力したかは記録しない）。
    """
    if req.cocktail_ids is None:
        candidates = COCKTAILS
    else:
        unknown = [i for i in req.cocktail_ids if i not in COCKTAILS_BY_ID]
        if unknown:
            raise HTTPException(
                status_code=422, detail=f"存在しないお酒のIDです: {unknown}"
            )
        candidates = [COCKTAILS_BY_ID[i] for i in dict.fromkeys(req.cocktail_ids)]

    ranked = similarity.nearest(req.query, candidates, TOP_N)
    query_log.record(req.query)
    return RecommendResponse(
        query=req.query,
        recommendations=[Recommendation(cocktail=c, score=s) for c, s in ranked],
    )
