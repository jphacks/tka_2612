from fastapi import APIRouter, HTTPException

from app.mock_data import COCKTAILS, COCKTAILS_BY_ID
from app.schemas import Cocktail

router = APIRouter(prefix="/cocktails", tags=["cocktails"])


@router.get("")
def list_cocktails() -> list[Cocktail]:
    """登録されているお酒の一覧"""
    return COCKTAILS


@router.get("/{cocktail_id}", responses={404: {"description": "お酒が見つからない"}})
def get_cocktail(cocktail_id: str) -> Cocktail:
    """お酒の詳細"""
    cocktail = COCKTAILS_BY_ID.get(cocktail_id)
    if cocktail is None:
        raise HTTPException(status_code=404, detail="お酒が見つかりません")
    return cocktail
