from fastapi import APIRouter, HTTPException

from app import similarity
from app.cocktail_db import COCKTAILS, COCKTAILS_BY_ID, VECTORS
from app.schemas import (
    Cocktail,
    CocktailVector,
    SearchRequest,
    SearchResponse,
    SimilarCocktail,
)

router = APIRouter(prefix="/cocktails", tags=["cocktails"])

SEARCH_LIMIT = 100


@router.get("")
def list_cocktails() -> list[Cocktail]:
    """登録されているお酒の一覧"""
    return COCKTAILS


# /{cocktail_id} より前に定義しないと、"vectors" がお酒のIDとして扱われる
@router.get("/vectors")
def list_cocktail_vectors() -> list[CocktailVector]:
    """登録されているお酒のベクトルの一覧（フロントエンドで次元削減して表示する用）"""
    return [
        CocktailVector(id=c.id, vector=VECTORS[c.id])
        for c in COCKTAILS
        if c.id in VECTORS
    ]


@router.get("/{cocktail_id}", responses={404: {"description": "お酒が見つからない"}})
def get_cocktail(cocktail_id: str) -> Cocktail:
    """お酒の詳細"""
    cocktail = COCKTAILS_BY_ID.get(cocktail_id)
    if cocktail is None:
        raise HTTPException(status_code=404, detail="お酒が見つかりません")
    return cocktail


@router.post(
    "/search",
    responses={
        503: {"description": "Gemini が使えない（API キー未設定・回数制限など）"}
    },
)
def search_cocktails(req: SearchRequest) -> SearchResponse:
    """入力文をベクトル化し、ベクトルが近い順（一致度の高い順）にお酒を100件返す

    一致度は入力文とお酒の説明文のコサイン類似度。データベース全体から探す。
    """
    nearest = similarity.nearest(req.text, COCKTAILS, SEARCH_LIMIT)
    return SearchResponse(
        text=req.text,
        results=[SimilarCocktail(cocktail=c, score=s) for c, s in nearest],
    )
