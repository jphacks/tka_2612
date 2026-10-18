"""メニューのお酒の名前を、データベースのお酒と照合する

名前と別名の表記ゆれ（中黒・長音・全角半角・大文字小文字・価格・括弧の補足）をそろえてから、
完全一致を探し、なければ1文字違いまでのあいまい一致で探す。
"""

import re
import unicodedata

from app.cocktail_db import COCKTAILS
from app.schemas import Cocktail

# あいまい一致で許す違いは、1文字の追加・削除・置き換えまで。
# 「ジントニク → ジン・トニック」「マリブコーラ → マリブコーク」のような読み間違い・表記違いは拾い、
# 「カルピス → カルピスサワー」「ピーチグレープフルーツ → ライチ・グレープフルーツ」のように
# 言葉が足された・別のお酒の名前は拾わない（共通部分の割合で比べると、これらも一致してしまう）
MAX_EDITS = 1

# これより短い名前は、1文字違いでも別の言葉になりやすいので、あいまい一致をしない
MIN_FUZZY_LENGTH = 4


def normalize(name: str) -> str:
    """照合用に表記ゆれをそろえる"""
    s = unicodedata.normalize("NFKC", name).lower()
    s = re.sub(r"\(.*?\)", "", s)  # 括弧の補足（NFKC で全角括弧も半角になる）
    s = re.sub(r"[¥$]\s*[\d,]+|[\d,]+\s*円", "", s)  # 価格
    s = re.sub(r"\band\b", "", s)  # Gin and Tonic と Gin Tonic をそろえる
    s = s.replace("ー", "").replace("ヴ", "ブ")
    return re.sub(r"[\s・･\-'’&.。、,/]", "", s)


def _build_index() -> dict[str, Cocktail]:
    index: dict[str, Cocktail] = {}
    for cocktail in COCKTAILS:
        for name in [cocktail.name, *cocktail.aliases]:
            # 同じ表記のお酒が複数あるときは、一覧で先に出てくる方を使う
            index.setdefault(normalize(name), cocktail)
    return index


_INDEX = _build_index()
_KEYS = list(_INDEX)


def match(name: str) -> Cocktail | None:
    """名前に一致するお酒を返す。見つからなければ None"""
    key = normalize(name)
    if not key:
        return None
    if key in _INDEX:
        return _INDEX[key]
    if len(key) < MIN_FUZZY_LENGTH:
        return None
    candidates = {_INDEX[k].id: _INDEX[k] for k in _KEYS if _within_one_edit(key, k)}
    # 1文字違いのお酒が複数あるときは、どれか決められないので一致させない
    return next(iter(candidates.values())) if len(candidates) == 1 else None


def _within_one_edit(a: str, b: str) -> bool:
    """a と b の違いが、1文字の追加・削除・置き換えまでか（同じ文字列は含まない）"""
    if a == b or abs(len(a) - len(b)) > MAX_EDITS:
        return False
    if len(a) > len(b):
        a, b = b, a
    # 先頭と末尾の共通部分を除き、残りが1文字以内なら1文字違い
    i = 0
    while i < len(a) and a[i] == b[i]:
        i += 1
    j = 0
    while j < len(a) - i and a[-1 - j] == b[-1 - j]:
        j += 1
    return len(b) - i - j <= MAX_EDITS and len(a) - i - j <= MAX_EDITS
