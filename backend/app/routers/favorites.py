from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query

from app import favorites
from app.cocktail_db import COCKTAILS_BY_ID
from app.schemas import (
    Cocktail,
    FavoriteCount,
    FavoriteRequest,
    FavoriteStatus,
)

router = APIRouter(prefix="/favorites", tags=["favorites"])

NOT_FOUND: dict[int | str, dict[str, Any]] = {
    404: {"description": "お酒が見つからない"}
}

DeviceId = Annotated[
    str,
    Query(min_length=1, max_length=100, description="ブラウザごとのランダムな端末ID"),
]


def _check_cocktail(cocktail_id: str) -> None:
    if cocktail_id not in COCKTAILS_BY_ID:
        raise HTTPException(status_code=404, detail="お酒が見つかりません")


@router.post("", responses=NOT_FOUND)
def add_favorite(req: FavoriteRequest) -> FavoriteStatus:
    """お気に入りに登録する（登録済みなら何もしない）"""
    _check_cocktail(req.cocktail_id)
    count = favorites.add(req.device_id, req.cocktail_id)
    return FavoriteStatus(
        cocktail_id=req.cocktail_id, favorited=True, favorite_count=count
    )


@router.delete("/{cocktail_id}", responses=NOT_FOUND)
def remove_favorite(cocktail_id: str, device_id: DeviceId) -> FavoriteStatus:
    """お気に入りから外す（未登録なら何もしない）"""
    _check_cocktail(cocktail_id)
    count = favorites.remove(device_id, cocktail_id)
    return FavoriteStatus(
        cocktail_id=cocktail_id, favorited=False, favorite_count=count
    )


@router.get("")
def list_favorites(device_id: DeviceId) -> list[Cocktail]:
    """端末のお気に入りのお酒（新しく登録した順）"""
    return [
        COCKTAILS_BY_ID[i]
        for i in favorites.list_ids(device_id)
        if i in COCKTAILS_BY_ID
    ]


@router.get("/counts")
def list_favorite_counts() -> list[FavoriteCount]:
    """お気に入りの総数が多い順のお酒（1件以上のもの）"""
    return [
        FavoriteCount(cocktail=COCKTAILS_BY_ID[i], favorite_count=n)
        for i, n in favorites.counts()
        if i in COCKTAILS_BY_ID
    ]
