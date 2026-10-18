"""Gemini API のクライアント

API キーは環境変数 GEMINI_API_KEY から読む（backend/.env に書き、make dev で読み込まれる）。
"""

import os
from functools import cache

from google import genai
from google.genai import errors, types

# interactions API（写真の読み取り）は、google.genai.errors とは別系統の例外を投げる。
# 公開されている場所がないため、SDK の内部モジュールから読み込む
from google.genai._gaos.lib.compat_errors import GeminiNextGenAPIClientError

# Gemini の呼び出しに失敗したときの例外（回数制限・タイムアウト・通信エラーなど）
GeminiError = (errors.APIError, GeminiNextGenAPIClientError)

# 1回の呼び出しの上限（ミリ秒）。これを超えたら打ち切って 503 を返す
TIMEOUT_MS = 30_000

# 再試行は、サーバー側の一時的なエラーだけを短い間隔で行う。
# 回数制限（429）は待っても回復しない（無料枠は1日単位）ため再試行せず、すぐ返す
RETRY = types.HttpRetryOptions(
    attempts=2, max_delay=2.0, http_status_codes=[500, 502, 503, 504]
)


def is_available() -> bool:
    """API キーが設定されていて、Gemini を呼べるか"""
    return bool(os.environ.get("GEMINI_API_KEY"))


@cache
def client() -> genai.Client:
    return genai.Client(
        http_options=types.HttpOptions(timeout=TIMEOUT_MS, retry_options=RETRY)
    )
