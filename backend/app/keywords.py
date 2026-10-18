"""検索履歴（おすすめで入力された文）のテキストマイニング

入力文を Janome で単語に分け、意味のある言葉（名詞・形容詞・副詞・動詞）だけを取り出して数える。
店舗向けの「よく求められた味」を、文ではなく言葉の単位で見るために使う。
"""

import unicodedata
from collections import Counter
from functools import cache

from janome.tokenizer import Token, Tokenizer

from app import query_log

# 残す品詞（Janome の品詞の「大分類」と「細分類」）
KEEP_NOUNS = {"一般", "固有名詞", "サ変接続", "形容動詞語幹"}
KEEP_POS = {"形容詞", "副詞", "動詞"}

# よく出るが、好みの手がかりにならない言葉（基本形で書く）
STOPWORDS = {
    # お酒そのものを指す言葉
    "酒",
    "お酒",
    "カクテル",
    "ドリンク",
    "飲み物",
    "もの",
    "一杯",
    "おすすめ",
    "気分",
    "感じ",
    "ベース",  # 「ジンベース」の「ジン」は残し、「ベース」だけを除く
    "好き",
    # 意味の薄い動詞・形容詞
    "飲む",
    "合う",
    "ある",
    "いる",
    "する",
    "なる",
    "できる",
    "くれる",
    "思う",
    "欲しい",
    "いい",
    "良い",
    # 程度を表すだけの副詞
    "とても",
    "すごく",
    "ちょっと",
    "少し",
    "かなり",
    "もっと",
    "よく",
    "一番",
}


@cache
def _tokenizer() -> Tokenizer:
    # 辞書の読み込みに時間がかかるので、一度だけ作る
    return Tokenizer()


def _is_meaningful(word: str) -> bool:
    if word in STOPWORDS:
        return False
    # ひらがな・記号1文字（「の」「ー」など）は除く。漢字1文字（「夏」など）は残す
    return len(word) >= 2 or unicodedata.name(word, "").startswith("CJK UNIFIED")


def extract_words(text: str) -> list[str]:
    """入力文から意味のある言葉を、出てきた順に返す（同じ言葉は1回だけ）"""
    normalized = unicodedata.normalize("NFKC", text).lower()
    words: list[str] = []
    for token in _tokenizer().tokenize(normalized):
        # 分かち書きを指定しなければ Token が返る（str は分かち書きのときだけ）
        if not isinstance(token, Token):
            continue
        pos, detail = token.part_of_speech.split(",")[:2]
        if pos == "名詞":
            if detail not in KEEP_NOUNS:
                continue
            word: str = token.surface
        elif pos in KEEP_POS:
            if detail == "非自立":
                continue
            # 「甘く」「甘かった」を「甘い」にそろえる
            word = token.base_form if token.base_form != "*" else token.surface
        else:
            continue
        if _is_meaningful(word) and word not in words:
            words.append(word)
    return words


def ranking(limit: int, days: int | None = None) -> list[tuple[str, int]]:
    """よく使われた言葉と、その言葉を含む検索の回数を、多い順に返す

    days を指定すると、直近 days 日の検索だけを数える。回数が同じなら言葉の順。
    """
    counter: Counter[str] = Counter()
    # 同じ入力文はまとめて1回だけ単語に分け、検索の回数をかける
    for query, count in query_log.ranking(limit=None, days=days):
        for word in extract_words(query):
            counter[word] += count
    return sorted(counter.items(), key=lambda pair: (-pair[1], pair[0]))[:limit]
