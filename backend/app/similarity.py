"""入力文とお酒のベクトルの近さで、お酒を並べる（おすすめ・検索で共通）"""

import logging

from fastapi import HTTPException

from app import embedding, gemini
from app.cocktail_db import VECTORS
from app.schemas import Cocktail

logger = logging.getLogger(__name__)


def nearest(
    text: str, candidates: list[Cocktail], limit: int
) -> list[tuple[Cocktail, float]]:
    """入力文のベクトルに近い順に、お酒と一致度（コサイン類似度）を limit 件返す

    Gemini が使えない（API キー未設定・回数制限など）ときは 503 を返す。
    """
    if not candidates:
        return []
    if not gemini.is_available():
        raise HTTPException(status_code=503, detail="この機能は現在使えません")
    try:
        query_vector = embedding.embed_query(text)
    except gemini.GeminiError as e:
        logger.warning("入力文のベクトル化に失敗しました: %s", e)
        raise HTTPException(
            status_code=503,
            detail="ただいま混み合っています。少し待ってからもう一度お試しください",
        ) from e

    scored = [
        (c, embedding.cosine_similarity(query_vector, VECTORS[c.id]))
        for c in candidates
    ]
    scored.sort(key=lambda pair: pair[1], reverse=True)
    return scored[:limit]
