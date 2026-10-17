"""Gemini API のクライアント

API キーは環境変数 GEMINI_API_KEY から読む（backend/.env に書き、make dev で読み込まれる）。
"""

import os
from functools import cache

from google import genai
from google.genai import errors

# Gemini の呼び出しに失敗したときの例外（回数制限・通信エラーなど）
GeminiError = errors.APIError


def is_available() -> bool:
    """API キーが設定されていて、Gemini を呼べるか"""
    return bool(os.environ.get("GEMINI_API_KEY"))


@cache
def client() -> genai.Client:
    return genai.Client()
