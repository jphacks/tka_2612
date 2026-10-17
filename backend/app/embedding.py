"""Gemini の埋め込みモデルで文章をベクトルにする

お酒の説明文と、ユーザーの入力文は、必ず同じモデル・同じ次元でベクトルにする
（違うモデルのベクトル同士は比べられない）。
"""

import math
import os
from functools import cache, lru_cache

from google import genai
from google.genai import errors, types

MODEL = "gemini-embedding-2"
DIMENSIONS = 768

# 無料枠は1分あたり100件（まとめて送っても1件ずつ数えられる）
REQUESTS_PER_MINUTE = 100

# 入力文のベクトルをメモリに何件まで保持するか（サーバーを再起動すると消える）
QUERY_CACHE_SIZE = 1024

# Gemini の呼び出しに失敗したときの例外（回数制限・通信エラーなど）
EmbeddingError = errors.APIError


def is_available() -> bool:
    """API キーが設定されていて、Gemini を呼べるか"""
    return bool(os.environ.get("GEMINI_API_KEY"))


@cache
def _client() -> genai.Client:
    return genai.Client()  # GEMINI_API_KEY を環境変数から読む


def _embed(texts: list[str]) -> list[list[float]]:
    # gemini-embedding-2 は、文字列を並べて渡すと1つのベクトルにまとめてしまうため、
    # 1件ずつ Content に包んで、件数分のベクトルを受け取る
    res = _client().models.embed_content(
        model=MODEL,
        contents=[types.Content(parts=[types.Part(text=t)]) for t in texts],
        config=types.EmbedContentConfig(output_dimensionality=DIMENSIONS),
    )
    vectors = [e.values or [] for e in res.embeddings or []]
    if len(vectors) != len(texts):
        raise RuntimeError(f"ベクトルの数が合いません: {len(vectors)} / {len(texts)}")
    return vectors


# gemini-embedding-2 は task_type が使えないため、用途を文章の先頭に書く
# https://ai.google.dev/gemini-api/docs/embeddings
def embed_documents(titles: list[str], texts: list[str]) -> list[list[float]]:
    """お酒の説明文（検索される側）をベクトルにする"""
    return _embed(
        [f"title: {t} | text: {x}" for t, x in zip(titles, texts, strict=True)]
    )


def embed_query(text: str) -> list[float]:
    """ユーザーの入力文（検索する側）をベクトルにする

    同じ入力文のベクトルは保持しておき、Gemini を呼ばずに再利用する（回数制限の節約）
    """
    return list(_embed_query_cached(text.strip()))


@lru_cache(maxsize=QUERY_CACHE_SIZE)
def _embed_query_cached(text: str) -> tuple[float, ...]:
    # 保持したベクトルが書き換えられないよう、tuple で持つ
    return tuple(_embed([f"task: search result | query: {text}"])[0])


def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    norm = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))
    return dot / norm if norm else 0.0
