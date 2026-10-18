import base64
import binascii
import logging
import re

from fastapi import APIRouter, File, HTTPException, UploadFile

from app import gemini, menu_matching, menu_reader
from app.schemas import (
    MatchedCocktail,
    MenuLocateRequest,
    MenuLocateResponse,
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

DATA_URL = re.compile(r"data:(?P<mime>[\w./+-]+);base64,(?P<data>.*)", re.DOTALL)


def _check_image(data: bytes, mime_type: str) -> None:
    """画像でない・大きすぎる・Gemini が使えないときはエラーにする"""
    if not mime_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="画像ファイルを送ってください")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="画像は 10MB までにしてください")
    if not gemini.is_available():
        raise HTTPException(status_code=503, detail="写真の読み取りは現在使えません")


def _decode_data_url(data_url: str) -> tuple[bytes, str]:
    """data URL から画像のバイト列と種類を取り出す"""
    m = DATA_URL.fullmatch(data_url)
    if m is None:
        raise HTTPException(status_code=415, detail="画像の data URL を送ってください")
    try:
        return base64.b64decode(m["data"], validate=True), m["mime"]
    except binascii.Error as e:
        raise HTTPException(status_code=415, detail="画像を読み取れませんでした") from e


def _busy(e: Exception) -> HTTPException:
    logger.warning("メニューの読み取りに失敗しました: %s", e)
    return HTTPException(
        status_code=503,
        detail="ただいま混み合っています。少し待ってからもう一度お試しください",
    )


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

    速くするため、位置は求めない（おすすめが決まったお酒の位置は `/menu/locate` で求める）。
    読み取った名前は、そのまま `/menu/match` に渡すとデータベースのお酒と照合できる。
    """
    data = image.file.read(MAX_IMAGE_BYTES + 1)
    mime_type = image.content_type or ""
    _check_image(data, mime_type)
    try:
        names = menu_reader.read_names(data, mime_type)
    except gemini.GeminiError as e:
        raise _busy(e) from e
    return MenuScanResponse(names=names)


@router.post(
    "/locate",
    responses={
        413: {"description": "画像が大きすぎる（10MB まで）"},
        415: {"description": "画像ではないファイル"},
        503: {"description": "Gemini が使えない（API キー未設定・回数制限など）"},
    },
)
def locate_menu_items(req: MenuLocateRequest) -> MenuLocateResponse:
    """メニューの写真の中で、指定したお酒の名前が書かれている位置を AI（Gemini）で求める

    おすすめが決まったお酒（5件）だけ位置を求めて、写真に印を付けるために使う。
    写真は data URL で受け取る（frontend が保存している縮小版をそのまま送れるようにするため）。
    `x`・`y` は名前の中心の位置（写真の幅・高さに対する %）。見つからなければ null。
    """
    data, mime_type = _decode_data_url(req.image)
    _check_image(data, mime_type)
    try:
        items = menu_reader.locate(data, mime_type, req.names)
    except gemini.GeminiError as e:
        raise _busy(e) from e
    return MenuLocateResponse(items=items)


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
