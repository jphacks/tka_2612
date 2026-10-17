from typing import Any

from fastapi import APIRouter, HTTPException

from app import store
from app.cocktail_db import COCKTAILS_BY_ID
from app.schemas import (
    CocktailStats,
    FavoriteRequest,
    Feedback,
    FeedbackRequest,
    QueryStats,
    StoreStats,
)

router = APIRouter()

NOT_FOUND: dict[int | str, dict[str, Any]] = {
    404: {"description": "お酒が見つからない"}
}


def _check_cocktail(cocktail_id: str) -> None:
    if cocktail_id not in COCKTAILS_BY_ID:
        raise HTTPException(status_code=404, detail="お酒が見つかりません")


@router.post("/feedback", tags=["feedback"], status_code=201, responses=NOT_FOUND)
def post_feedback(req: FeedbackRequest) -> Feedback:
    """推薦結果に 👍/👎 を付ける"""
    _check_cocktail(req.cocktail_id)
    return store.add_feedback(req)


@router.get("/favorites", tags=["favorites"])
def list_favorites(device_id: str) -> list[str]:
    """端末のお気に入りのお酒IDの一覧"""
    return sorted(store.list_favorites(device_id))


@router.post("/favorites", tags=["favorites"], status_code=204, responses=NOT_FOUND)
def add_favorite(req: FavoriteRequest) -> None:
    """お気に入りに登録する（登録済みなら何もしない）"""
    _check_cocktail(req.cocktail_id)
    store.add_favorite(req.device_id, req.cocktail_id)


@router.delete("/favorites/{cocktail_id}", tags=["favorites"], status_code=204)
def remove_favorite(cocktail_id: str, device_id: str) -> None:
    """お気に入りから外す（未登録なら何もしない）"""
    store.remove_favorite(device_id, cocktail_id)


@router.get("/stats", tags=["stats"])
def get_stats() -> StoreStats:
    """店舗向けの集計（お酒ごとの 👍/👎・お気に入り数と、よく求められた味）"""
    ratings = store.count_ratings()
    favorites = store.count_favorites()
    cocktails = [
        CocktailStats(
            cocktail=COCKTAILS_BY_ID[cid],
            up=ratings.get(cid, {}).get("up", 0),
            down=ratings.get(cid, {}).get("down", 0),
            favorites=favorites[cid],
        )
        for cid in COCKTAILS_BY_ID
        if cid in ratings or cid in favorites
    ]
    cocktails.sort(key=lambda s: (s.up, -s.down, s.favorites), reverse=True)
    return StoreStats(
        cocktails=cocktails,
        queries=[QueryStats(query=q, count=n) for q, n in store.query_ranking()],
    )
