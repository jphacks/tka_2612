"""メニューのお酒の名前を、データベースのお酒と照合する

名前と別名の表記ゆれ（中黒・長音・全角半角・大文字小文字・価格・括弧の補足）をそろえてから、
完全一致を探し、なければ difflib のあいまい一致で探す。
"""

import difflib
import re
import unicodedata

from app.cocktail_db import COCKTAILS
from app.schemas import Cocktail

# あいまい一致とみなす類似度の下限（0〜1）。
# 0.8 だと「ジントニク → ジン・トニック」は拾い、「生ビール → ドービル」は拾わない
FUZZY_CUTOFF = 0.8


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
    close = difflib.get_close_matches(key, _KEYS, n=1, cutoff=FUZZY_CUTOFF)
    return _INDEX[close[0]] if close else None
