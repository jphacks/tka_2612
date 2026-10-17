from fastapi import FastAPI

from app.routers import cocktails, feedback, recommendations

app = FastAPI(title="tka_2612 API")
app.include_router(cocktails.router)
app.include_router(recommendations.router)
app.include_router(feedback.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
