import zlib
from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile

from app import store
from app.mock_data import (
    COCKTAILS,
    COCKTAILS_BY_ID,
    MOCK_MENU_COCKTAIL_IDS,
    MOCK_SCORES,
    MOCK_UNREGISTERED,
)
from app.schemas import Cocktail, Recommendation, RecommendResponse

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def _rotate(cocktails: list[Cocktail], query: str) -> list[Cocktail]:
    """入力文ごとに結果が変わるよう、入力文から決まる位置で並びをずらす（モック用）"""
    shift = zlib.crc32(query.encode()) % len(cocktails)
    return cocktails[shift:] + cocktails[:shift]


@router.post("")
async def recommend(
    query: Annotated[str, Form(description="味の希望や、シーン・気分を表す文")],
    image: Annotated[
        UploadFile | None,
        File(description="メニューの写真。省略するとデータベース全体から探す"),
    ] = None,
) -> RecommendResponse:
    """好みに合うお酒を一致度の高い順に上位5件返す（モック）"""
    if image is not None:
        candidates = [COCKTAILS_BY_ID[i] for i in MOCK_MENU_COCKTAIL_IDS]
        unregistered = MOCK_UNREGISTERED
    else:
        candidates = COCKTAILS
        unregistered = []

    ranked = _rotate(candidates, query)[: len(MOCK_SCORES)]
    store.add_query(query)
    return RecommendResponse(
        query=query,
        recommendations=[
            Recommendation(cocktail=c, score=s)
            for c, s in zip(ranked, MOCK_SCORES, strict=False)
        ],
        unregistered=unregistered,
    )
