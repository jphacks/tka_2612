import logging

from fastapi import APIRouter, HTTPException

from app import embedding, gemini
from app.cocktail_db import COCKTAILS, COCKTAILS_BY_ID, VECTORS
from app.schemas import Recommendation, RecommendRequest, RecommendResponse

router = APIRouter(prefix="/recommendations", tags=["recommendations"])
logger = logging.getLogger(__name__)

TOP_N = 5


@router.post(
    "",
    responses={
        422: {"description": "存在しないお酒のIDが含まれている"},
        503: {"description": "Gemini が使えない（API キー未設定・回数制限など）"},
    },
)
def recommend(req: RecommendRequest) -> RecommendResponse:
    """入力文（味の希望や気分）に合うお酒を、一致度の高い順に上位5件返す

    `cocktail_ids` を渡すと、その中からだけ選ぶ（メニューの写真から照合したお酒など）。
    省略すると、データベース全体から選ぶ。一致度は入力文とお酒の説明文のコサイン類似度。
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

    if not candidates:
        return RecommendResponse(query=req.query, recommendations=[])
    if not gemini.is_available():
        raise HTTPException(status_code=503, detail="おすすめは現在使えません")

    try:
        query_vector = embedding.embed_query(req.query)
    except gemini.GeminiError as e:
        logger.warning("入力文のベクトル化に失敗しました: %s", e)
        raise HTTPException(
            status_code=503,
            detail="ただいま混み合っています。少し待ってからもう一度お試しください",
        ) from e

    ranked = sorted(
        (
            Recommendation(
                cocktail=c,
                score=embedding.cosine_similarity(query_vector, VECTORS[c.id]),
            )
            for c in candidates
        ),
        key=lambda r: r.score,
        reverse=True,
    )
    return RecommendResponse(query=req.query, recommendations=ranked[:TOP_N])
