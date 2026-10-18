"""入力文とお酒のベクトルの近さで、お酒を並べる（おすすめ・検索で共通）"""

from app import embedding, gemini
from app.cocktail_db import VECTORS
from app.schemas import Cocktail


def nearest(
    text: str, candidates: list[Cocktail], limit: int
) -> list[tuple[Cocktail, float]]:
    """入力文のベクトルに近い順に、お酒と一致度（コサイン類似度）を limit 件返す

    Gemini が使えない（API キー未設定・回数制限など）ときは GeminiUnavailableError を投げる。
    """
    if not candidates:
        return []
    gemini.require_available()
    with gemini.report_failure("入力文のベクトル化"):
        query_vector = embedding.embed_query(text)

    scored = [
        (c, embedding.cosine_similarity(query_vector, VECTORS[c.id]))
        for c in candidates
    ]
    scored.sort(key=lambda pair: pair[1], reverse=True)
    return scored[:limit]
