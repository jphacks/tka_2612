from fastapi import FastAPI
from fastapi.routing import APIRoute

from app.routers import cocktails


def generate_unique_id(route: APIRoute) -> str:
    # フロントエンドで生成する関数名を短くするため、operationId にエンドポイントの関数名を使う
    return route.name


app = FastAPI(title="tka_2612 API", generate_unique_id_function=generate_unique_id)
app.include_router(cocktails.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
