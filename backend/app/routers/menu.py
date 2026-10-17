from fastapi import APIRouter

from app import menu_matching
from app.schemas import MatchedCocktail, MenuMatchRequest, MenuMatchResponse

router = APIRouter(prefix="/menu", tags=["menu"])


@router.post("/match")
def match_menu(req: MenuMatchRequest) -> MenuMatchResponse:
    """メニューに載っているお酒の名前を、データベースのお酒と照合する

    同じお酒に何度も一致したときは、最初の1件だけを返す。
    """
    matched: list[MatchedCocktail] = []
    unregistered: list[str] = []
    seen: set[str] = set()
    for name in req.names:
        if not name.strip():
            continue
        cocktail = menu_matching.match(name)
        if cocktail is None:
            unregistered.append(name)
        elif cocktail.id not in seen:
            seen.add(cocktail.id)
            matched.append(MatchedCocktail(name=name, cocktail=cocktail))
    return MenuMatchResponse(matched=matched, unregistered=unregistered)
