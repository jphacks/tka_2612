import logging
import zlib
from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile

from app import embedding, store
from app.cocktail_db import COCKTAILS, COCKTAILS_BY_ID, VECTORS
from app.mock_data import MOCK_MENU_COCKTAIL_IDS, MOCK_SCORES, MOCK_UNREGISTERED
from app.schemas import Cocktail, Recommendation, RecommendResponse

router = APIRouter(prefix="/recommendations", tags=["recommendations"])
logger = logging.getLogger(__name__)

TOP_N = 5


def _rank_by_vector(query: str, candidates: list[Cocktail]) -> list[Recommendation]:
    """入力文とお酒の説明文のコサイン類似度で並べる"""
    query_vector = embedding.embed_query(query)
    ranked = [
        Recommendation(
            cocktail=c,
            score=embedding.cosine_similarity(query_vector, VECTORS[c.id]),
        )
        for c in candidates
    ]
    ranked.sort(key=lambda r: r.score, reverse=True)
    return ranked[:TOP_N]


def _rank_by_mock(query: str, candidates: list[Cocktail]) -> list[Recommendation]:
    """ベクトルが使えないときの仮の順位。入力文から決まる位置で並びをずらす"""
    shift = zlib.crc32(query.encode()) % len(candidates)
    rotated = candidates[shift:] + candidates[:shift]
    return [
        Recommendation(cocktail=c, score=s)
        for c, s in zip(rotated, MOCK_SCORES, strict=False)
    ]


@router.post("")
async def recommend(
    query: Annotated[str, Form(description="味の希望や、シーン・気分を表す文")],
    image: Annotated[
        UploadFile | None,
        File(description="メニューの写真。省略するとデータベース全体から探す"),
    ] = None,
) -> RecommendResponse:
    """好みに合うお酒を一致度の高い順に上位5件返す（写真の読み取りはまだモック）"""
    if image is not None:
        candidates = [COCKTAILS_BY_ID[i] for i in MOCK_MENU_COCKTAIL_IDS]
        unregistered = MOCK_UNREGISTERED
    else:
        candidates = COCKTAILS
        unregistered = []

    use_vector = embedding.is_available() and all(c.id in VECTORS for c in candidates)
    if not use_vector:
        logger.warning("ベクトルが使えないため、モックの順位を返します")
    rank = _rank_by_vector if use_vector else _rank_by_mock

    store.add_query(query)
    return RecommendResponse(
        query=query,
        recommendations=rank(query, candidates),
        unregistered=unregistered,
    )
