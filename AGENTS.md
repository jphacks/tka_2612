# AGENTS.md

エージェント向けの作業ルール。

## 開発環境

- Dev Container（Ubuntu）で動作する。設定は `.devcontainer/` を参照
- Python: uv（`UV_LINK_MODE=copy`）
- Node.js: LTS

## Python

- Python の実行は必ず uv 経由で行う（例: `uv run python script.py`, `uv run pytest`）
- `python` / `pip` / `python -m venv` を直接使わない

## チェック

- コードを変更したら、`backend/` で `make check`（ruff・ty）を実行し、すべて通してから作業完了とする
- コミット時も pre-commit フック（`.githooks/pre-commit`）で `make check` が走る。失敗したら直してからコミットする
- `git commit --no-verify` でフックを飛ばさない
- `# noqa` / `# type: ignore` の追加や、ルールを緩める設定変更でエラーを黙らせない。必要な場合は理由を添えてユーザに確認する

## 依存ライブラリ

- ライブラリを勝手に追加しない（`uv add` / `npm install <pkg>` など）
- 必要な場合は、理由を添えてユーザに許可を求めてから追加する

## Git

- 区切りの良いタイミングでこまめにコミットする
- 1コミット1目的を意識し、無関係な変更を混ぜない

### ブランチ名

`<type>/<内容>` の形式。内容は英小文字の kebab-case（例: `feature/devcontainer`, `fix/login-error`）

| type | 用途 |
| --- | --- |
| `feature` | 新機能 |
| `fix` | バグ修正 |
| `docs` | ドキュメントのみ |
| `refactor` | 挙動を変えないコード整理 |
| `chore` | 環境・設定・依存関係など |

### コミットメッセージ

`<type>: <要約>` の形式（Conventional Commits 準拠）。要約は日本語で簡潔に、末尾に句点を付けない

- type: `feat` / `fix` / `docs` / `refactor` / `test` / `chore`
- 例: `feat: ログイン画面を追加`, `docs: AGENTS.mdにGitルールを追記`
- 補足が必要なら1行空けて本文に理由を書く

## このファイルについて

- 100行以内に収まるよう簡潔に保つ
