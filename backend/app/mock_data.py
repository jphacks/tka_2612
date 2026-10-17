"""モック用の固定データ。メニュー写真の読み取りを実装したら消す"""

# ベクトルが使えないとき（API キーなし・ベクトル未生成）の一致度の固定値
MOCK_SCORES: list[float] = [0.91, 0.86, 0.79, 0.72, 0.65]

# 写真から読み取れたことにするお酒（登録済み）と未登録のお酒
MOCK_MENU_COCKTAIL_IDS: list[str] = [
    "cassis-orange",
    "pina-colada",
    "cosmopolitan",
    "spumoni",
    "gin-tonic",
    "mojito",
]
MOCK_UNREGISTERED: list[str] = ["店長おすすめサワー", "季節のフルーツカクテル"]
