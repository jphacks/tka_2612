from fastapi import FastAPI

app = FastAPI(title="tka_2612 API")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
