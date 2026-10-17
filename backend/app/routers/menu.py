import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from app import gemini, menu_matching, menu_reader
from app.schemas import (
    MatchedCocktail,
    MenuMatchRequest,
    MenuMatchResponse,
    MenuScanResponse,
)

router = APIRouter(prefix="/menu", tags=["menu"])
logger = logging.getLogger(__name__)

# Gemini に画像をそのまま送れるのは、リクエスト全体で 20MB まで
MAX_IMAGE_BYTES = 10 * 1024 * 1024

# 受け取る写真（multipart の image）
MENU_IMAGE = File(description="メニューの写真（JPEG・PNG など）")


@router.post(
    "/scan",
    responses={
        413: {"description": "画像が大きすぎる（10MB まで）"},
        415: {"description": "画像ではないファイル"},
        503: {"description": "Gemini が使えない（API キー未設定・回数制限など）"},
    },
)
def scan_menu(
    image: UploadFile = MENU_IMAGE,
) -> MenuScanResponse:
    """メニューの写真から、載っているお酒の名前を AI（Gemini）で読み取る

    読み取った名前は、そのまま `/menu/match` に渡すとデータベースのお酒と照合できる。
    """
    mime_type = image.content_type or ""
    if not mime_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="画像ファイルを送ってください")
    data = image.file.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="画像は 10MB までにしてください")
    if not gemini.is_available():
        raise HTTPException(status_code=503, detail="写真の読み取りは現在使えません")

    try:
        names = menu_reader.read_drink_names(data, mime_type)
    except gemini.GeminiError as e:
        logger.warning("メニューの読み取りに失敗しました: %s", e)
        raise HTTPException(
            status_code=503,
            detail="ただいま混み合っています。少し待ってからもう一度お試しください",
        ) from e
    return MenuScanResponse(names=names)


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
