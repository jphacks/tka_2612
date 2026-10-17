import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute

from app.routers import cocktails, favorites, menu, recommendations, store


def generate_unique_id(route: APIRoute) -> str:
    # フロントエンドで生成する関数名を短くするため、operationId にエンドポイントの関数名を使う
    return route.name


app = FastAPI(title="tka_2612 API", generate_unique_id_function=generate_unique_id)

# ブラウザのフロントエンド（別のオリジン）から API を呼べるようにする。
# 許可するオリジンは環境変数 CORS_ORIGINS（カンマ区切り）で変えられる
CORS_ORIGINS = os.environ.get(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(cocktails.router)
app.include_router(menu.router)
app.include_router(recommendations.router)
app.include_router(favorites.router)
app.include_router(store.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
