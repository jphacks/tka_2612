import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute

from app import gemini
from app.routers import cocktails, favorites, menu, recommendations, store


def generate_unique_id(route: APIRoute) -> str:
    # フロントエンドで生成する関数名を短くするため、operationId にエンドポイントの関数名を使う
    return route.name


app = FastAPI(title="tka_2612 API", generate_unique_id_function=generate_unique_id)

# ブラウザのフロントエンド（別オリジン）から API を呼べるようにする。
# 許可するオリジンは環境変数 CORS_ORIGINS にカンマ区切りで書く（既定はフロントエンドの開発サーバー）
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(gemini.GeminiUnavailableError)
async def gemini_unavailable(
    _: Request, exc: gemini.GeminiUnavailableError
) -> JSONResponse:
    """Gemini を呼べないときは、どのエンドポイントでも 503 を返す"""
    return JSONResponse(status_code=503, content={"detail": exc.detail})


app.include_router(cocktails.router)
app.include_router(menu.router)
app.include_router(recommendations.router)
app.include_router(favorites.router)
app.include_router(store.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
