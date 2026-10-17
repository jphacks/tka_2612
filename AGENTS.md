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

- コードを変更したら、変更したディレクトリで `make check` を実行し、すべて通してから作業完了とする
  - `backend/`: ruff（リント・フォーマット）と ty（型）
  - `frontend/`: Biome（リント・フォーマット）と tsc（型）
- コミット時も pre-commit フック（`.githooks/pre-commit`）で両方の `make check` が走る。失敗したら直してからコミットする
- `git commit --no-verify` でフックを飛ばさない
- `# noqa` / `# type: ignore` / `biome-ignore` の追加や、ルールを緩める設定変更でエラーを黙らせない。必要な場合は理由を添えてユーザに確認する

## API

- バックエンドの API を変更したら、`backend/` → `frontend/` の順に `make gen-api` を実行し、生成物も一緒にコミットする
- フロントエンドからバックエンドを呼ぶときは、orval が生成した `frontend/app/api/generated.ts` の関数を使う。生成物は手で編集しない

## 依存ライブラリ・インストール

- ライブラリを勝手に追加しない（`uv add` / `npm install <pkg>` など）
- 環境へのインストールも勝手にしない（`sudo apt-get install`、ブラウザやツールのダウンロードなど。一時ディレクトリへの導入や検証目的でも同様）
- 必要な場合は、理由を添えてユーザに許可を求めてから行う

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
