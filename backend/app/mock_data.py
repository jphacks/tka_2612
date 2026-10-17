"""モック用の固定データ。本実装ではベクトル込みの JSON とモデルに置き換える"""

from app.schemas import Cocktail

COCKTAILS: list[Cocktail] = [
    Cocktail(
        id="cassis-orange",
        name="カシスオレンジ",
        aliases=["Cassis Orange", "カシオレ"],
        description="カシスの甘酸っぱさとオレンジの爽やかさが合わさった、ジュースのように飲みやすい一杯。",
        ingredients=["カシスリキュール", "オレンジジュース"],
    ),
    Cocktail(
        id="kahlua-milk",
        name="カルーアミルク",
        aliases=["Kahlua Milk", "カルーア"],
        description="コーヒーリキュールの香ばしさとミルクのまろやかさ。デザートのように甘い。",
        ingredients=["カルーア", "牛乳"],
    ),
    Cocktail(
        id="mojito",
        name="モヒート",
        aliases=["Mojito"],
        description="ミントとライムの清涼感が強く、すっきり爽快。ラムのほのかな甘みがある。",
        ingredients=["ホワイトラム", "ミント", "ライム", "砂糖", "ソーダ"],
    ),
    Cocktail(
        id="gin-tonic",
        name="ジントニック",
        aliases=["Gin Tonic", "Gin and Tonic", "ジントニ"],
        description="ジンのハーブの香りとトニックのほろ苦さ。甘さ控えめでキレがある。",
        ingredients=["ジン", "トニックウォーター", "ライム"],
    ),
    Cocktail(
        id="margarita",
        name="マルガリータ",
        aliases=["Margarita"],
        description="テキーラにライムの酸味、グラスの縁の塩がアクセント。爽やかで力強い。",
        ingredients=["テキーラ", "コアントロー", "ライムジュース", "塩"],
    ),
    Cocktail(
        id="pina-colada",
        name="ピニャコラーダ",
        aliases=["Piña Colada", "Pina Colada"],
        description="パイナップルとココナッツの南国風味。甘くてクリーミー。",
        ingredients=["ホワイトラム", "パイナップルジュース", "ココナッツミルク"],
    ),
    Cocktail(
        id="moscow-mule",
        name="モスコミュール",
        aliases=["Moscow Mule"],
        description="ジンジャーのピリッとした辛みとライムの酸味。すっきり飲みやすい。",
        ingredients=["ウォッカ", "ジンジャービア", "ライム"],
    ),
    Cocktail(
        id="cosmopolitan",
        name="コスモポリタン",
        aliases=["Cosmopolitan", "コスモ"],
        description="クランベリーの甘酸っぱさとライムの香り。華やかでフルーティ。",
        ingredients=[
            "ウォッカ",
            "コアントロー",
            "クランベリージュース",
            "ライムジュース",
        ],
    ),
    Cocktail(
        id="manhattan",
        name="マンハッタン",
        aliases=["Manhattan"],
        description="ウイスキーとスイートベルモットの深いコク。甘くほろ苦い大人の味。",
        ingredients=["ライウイスキー", "スイートベルモット", "アンゴスチュラビターズ"],
    ),
    Cocktail(
        id="spumoni",
        name="スプモーニ",
        aliases=["Spumoni"],
        description="カンパリのほろ苦さにグレープフルーツの爽やかさ。軽くて飲みやすい。",
        ingredients=["カンパリ", "グレープフルーツジュース", "トニックウォーター"],
    ),
]

COCKTAILS_BY_ID: dict[str, Cocktail] = {c.id: c for c in COCKTAILS}

# 一致度の固定値（上から順に割り当てる）
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
