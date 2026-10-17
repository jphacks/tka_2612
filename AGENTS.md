# AGENTS.md

エージェント向けの作業ルール。

## 開発環境

- Dev Container（Ubuntu）で動作する。設定は `.devcontainer/` を参照
- Python: uv（`UV_LINK_MODE=copy`）
- Node.js: LTS

## Python

- Python の実行は必ず uv 経由で行う（例: `uv run python script.py`, `uv run pytest`）
- `python` / `pip` / `python -m venv` を直接使わない

## 依存ライブラリ

- ライブラリを勝手に追加しない（`uv add` / `npm install <pkg>` など）
- 必要な場合は、理由を添えてユーザに許可を求めてから追加する

## Git

- 区切りの良いタイミングでこまめにコミットする
- 1コミット1目的を意識し、無関係な変更を混ぜない

## このファイルについて

- 100行以内に収まるよう簡潔に保つ
