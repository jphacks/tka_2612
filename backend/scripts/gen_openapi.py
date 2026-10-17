"""FastAPI のアプリから openapi.json を書き出す"""

import json
from pathlib import Path

from app.main import app

OUTPUT = Path(__file__).resolve().parent.parent / "openapi.json"


def main() -> None:
    schema = json.dumps(app.openapi(), ensure_ascii=False, indent=2)
    OUTPUT.write_text(schema + "\n", encoding="utf-8")
    print(f"{OUTPUT} を生成しました")


if __name__ == "__main__":
    main()
