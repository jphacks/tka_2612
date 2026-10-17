import type { Cocktail } from "./types";

// 一致度を擬似的に計算するためのキーワード（本物の API ではベクトルで計算する）
export type MockCocktail = Cocktail & { keywords: string[] };

export const MOCK_COCKTAILS: MockCocktail[] = [
  {
    id: "mojito",
    name: "モヒート",
    aliases: ["Mojito"],
    description:
      "ミントとライムの香りが広がる、爽やかでさっぱりした味わい。暑い日にぴったり。",
    ingredients: ["ホワイトラム", "ミント", "ライム", "砂糖", "ソーダ"],
    keywords: ["さっぱり", "爽やか", "ミント", "ライム", "夏", "暑", "雨上がり"],
  },
  {
    id: "cassis-orange",
    name: "カシスオレンジ",
    aliases: ["Cassis Orange", "カシオレ"],
    description:
      "カシスの甘酸っぱさとオレンジのフルーティさ。アルコール感が弱く飲みやすい。",
    ingredients: ["カシスリキュール", "オレンジジュース"],
    keywords: ["甘", "フルーティ", "フルーツ", "オレンジ", "飲みやすい", "初心者"],
  },
  {
    id: "gin-tonic",
    name: "ジントニック",
    aliases: ["Gin and Tonic", "ジントニ"],
    description:
      "ジンの香りとトニックのほろ苦さ。すっきりしていて、どんな料理にも合う定番。",
    ingredients: ["ジン", "トニックウォーター", "ライム"],
    keywords: ["さっぱり", "すっきり", "苦", "爽やか", "定番"],
  },
  {
    id: "martini",
    name: "マティーニ",
    aliases: ["Martini"],
    description:
      "ジンとドライベルモットだけで作る、キリッと辛口で度数の強い大人の一杯。",
    ingredients: ["ジン", "ドライベルモット", "オリーブ"],
    keywords: ["強", "辛口", "ドライ", "大人", "夜"],
  },
  {
    id: "kahlua-milk",
    name: "カルーアミルク",
    aliases: ["Kahlua Milk"],
    description:
      "コーヒーリキュールと牛乳の、まろやかでやさしい甘さ。デザート感覚で飲める。",
    ingredients: ["コーヒーリキュール", "牛乳"],
    keywords: ["甘", "クリーミー", "まろやか", "やさしい", "コーヒー", "デザート", "失恋", "慰め", "疲れ"],
  },
  {
    id: "salty-dog",
    name: "ソルティドッグ",
    aliases: ["Salty Dog"],
    description:
      "グラスの縁の塩が、グレープフルーツのほろ苦さと酸味を引き立てる。",
    ingredients: ["ウォッカ", "グレープフルーツジュース", "塩"],
    keywords: ["さっぱり", "フルーティ", "グレープフルーツ", "苦", "しょっぱ"],
  },
  {
    id: "spumoni",
    name: "スプモーニ",
    aliases: ["Spumoni"],
    description:
      "カンパリのほろ苦さとグレープフルーツの爽やかさ。少し切ない大人の味。",
    ingredients: ["カンパリ", "グレープフルーツジュース", "トニックウォーター"],
    keywords: ["苦", "フルーティ", "爽やか", "グレープフルーツ", "失恋", "切な"],
  },
  {
    id: "margarita",
    name: "マルガリータ",
    aliases: ["Margarita"],
    description:
      "テキーラとライムの鮮烈な酸味に、縁の塩がアクセント。パーティの主役。",
    ingredients: ["テキーラ", "ホワイトキュラソー", "ライム", "塩"],
    keywords: ["酸", "強", "ライム", "祝", "パーティ", "テンション"],
  },
  {
    id: "pina-colada",
    name: "ピニャコラーダ",
    aliases: ["Piña Colada", "Pina Colada"],
    description:
      "パイナップルとココナッツの濃厚な甘さ。南国気分になれるトロピカルな一杯。",
    ingredients: ["ホワイトラム", "パイナップルジュース", "ココナッツミルク"],
    keywords: ["甘", "フルーティ", "フルーツ", "トロピカル", "南国", "クリーミー", "夏"],
  },
  {
    id: "fuzzy-navel",
    name: "ファジーネーブル",
    aliases: ["Fuzzy Navel"],
    description: "桃とオレンジのジューシーな甘さ。ジュースのように飲みやすい。",
    ingredients: ["ピーチリキュール", "オレンジジュース"],
    keywords: ["甘", "フルーティ", "フルーツ", "桃", "ピーチ", "オレンジ", "飲みやすい", "初心者"],
  },
  {
    id: "moscow-mule",
    name: "モスコミュール",
    aliases: ["Moscow Mule"],
    description:
      "ジンジャーのピリッとした刺激とライムの爽快感。元気を出したい日に。",
    ingredients: ["ウォッカ", "ジンジャービア", "ライム"],
    keywords: ["さっぱり", "爽やか", "ジンジャー", "生姜", "元気", "雨上がり"],
  },
  {
    id: "cosmopolitan",
    name: "コスモポリタン",
    aliases: ["Cosmopolitan"],
    description:
      "クランベリーの甘酸っぱさが華やかな、ピンク色のおしゃれなカクテル。",
    ingredients: ["ウォッカ", "ホワイトキュラソー", "クランベリージュース", "ライム"],
    keywords: ["フルーティ", "甘酸っぱ", "華やか", "おしゃれ", "祝", "デート"],
  },
  {
    id: "irish-coffee",
    name: "アイリッシュコーヒー",
    aliases: ["Irish Coffee"],
    description:
      "温かいコーヒーにウイスキーと生クリーム。冷えた体と心をじんわり温める。",
    ingredients: ["アイリッシュウイスキー", "コーヒー", "砂糖", "生クリーム"],
    keywords: ["温か", "ホット", "コーヒー", "寒", "雨", "慰め", "失恋", "疲れ"],
  },
  {
    id: "mimosa",
    name: "ミモザ",
    aliases: ["Mimosa"],
    description:
      "シャンパンとオレンジジュースの軽やかな一杯。お祝いや乾杯にぴったり。",
    ingredients: ["シャンパン", "オレンジジュース"],
    keywords: ["フルーティ", "オレンジ", "華やか", "祝", "乾杯", "軽"],
  },
];

// メニュー写真を読み取った結果として返す、固定の文字列（OCR の代わり）
export const MOCK_MENU_LINES = [
  "モヒート ¥900",
  "カシスオレンジ ¥700",
  "ジントニック ¥800",
  "カルーアミルク ¥700",
  "スプモーニ ¥800",
  "ファジーネーブル ¥700",
  "マティーニ ¥1,000",
  "季節のフルーツサワー ¥750",
  "店長おすすめハイボール ¥650",
];
