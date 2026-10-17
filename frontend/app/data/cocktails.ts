export type Cocktail = {
  id: string;
  name: string;
  englishName: string;
  description: string;
  ingredients: string[];
  tags: string[];
  color: string;
  matchTerms: string[];
  menuPosition: { x: number; y: number };
  detail: string;
};

export const cocktails: Cocktail[] = [
  {
    id: "cassis-orange",
    name: "カシスオレンジ",
    englishName: "Cassis Orange",
    description:
      "カシスの甘酸っぱさとオレンジの果実感。飲みやすく華やかな一杯。",
    ingredients: ["カシスリキュール", "オレンジジュース"],
    tags: ["甘口", "フルーティー"],
    color: "cassis",
    matchTerms: ["甘", "フルーティ", "果実", "カシス", "オレンジ", "飲みやす"],
    menuPosition: { x: 48, y: 24 },
    detail:
      "カシスの深い甘みをオレンジジュースで軽やかに仕上げた、カクテルの定番。甘酸っぱく親しみやすい味わいで、初めての一杯にもおすすめです。",
  },
  {
    id: "fuzzy-navel",
    name: "ファジーネーブル",
    englishName: "Fuzzy Navel",
    description: "ピーチのやさしい甘みとオレンジの爽やかさが広がります。",
    ingredients: ["ピーチリキュール", "オレンジジュース"],
    tags: ["甘口", "ピーチ"],
    color: "peach",
    matchTerms: [
      "甘",
      "フルーティ",
      "桃",
      "ピーチ",
      "やさしい",
      "オレンジ",
      "飲みやす",
    ],
    menuPosition: { x: 51, y: 40 },
    detail:
      "桃の香りが豊かなピーチリキュールとオレンジジュースを合わせた、まろやかなカクテル。アルコール感が穏やかで、デザート感覚で楽しめます。",
  },
  {
    id: "china-blue",
    name: "チャイナブルー",
    englishName: "China Blue",
    description: "ライチの香りにグレープフルーツのほろ苦さを添えた味わい。",
    ingredients: ["ライチリキュール", "グレープフルーツ", "ブルーキュラソー"],
    tags: ["さっぱり", "柑橘"],
    color: "blue",
    matchTerms: [
      "さっぱり",
      "柑橘",
      "ライチ",
      "爽やか",
      "すっきり",
      "グレープフルーツ",
    ],
    menuPosition: { x: 49, y: 57 },
    detail:
      "ライチの華やかな香りとグレープフルーツのほろ苦さが調和した、青い色合いも美しい一杯。すっきりした後味が好きな方にぴったりです。",
  },
  {
    id: "mojito",
    name: "モヒート",
    englishName: "Mojito",
    description: "ミントとライムの香りが弾ける、爽快なラムカクテル。",
    ingredients: ["ラム", "ミント", "ライム", "ソーダ"],
    tags: ["爽快", "ミント"],
    color: "mint",
    matchTerms: [
      "さっぱり",
      "ミント",
      "爽快",
      "炭酸",
      "ラム",
      "ライム",
      "すっきり",
    ],
    menuPosition: { x: 50, y: 74 },
    detail:
      "ラムにミント、ライム、ソーダを合わせたキューバ生まれのカクテル。ミントの清涼感とライムの酸味で、気分をリフレッシュしたい夜におすすめです。",
  },
  {
    id: "kahlua-milk",
    name: "カルーアミルク",
    englishName: "Kahlua Milk",
    description: "コーヒーリキュールとミルクの、まろやかでコクのある一杯。",
    ingredients: ["コーヒーリキュール", "ミルク"],
    tags: ["甘口", "クリーミー"],
    color: "coffee",
    matchTerms: ["甘", "コーヒー", "ミルク", "クリーミー", "デザート", "濃厚"],
    menuPosition: { x: 50, y: 89 },
    detail:
      "コーヒーの香ばしさとミルクのやさしい口当たりが楽しめる、デザートのようなカクテル。苦味と甘みのバランスがよく、ゆっくり過ごしたいときに。",
  },
];

export function rankCocktails(query: string) {
  const normalizedQuery = query.toLocaleLowerCase();

  return cocktails
    .map((cocktail, index) => {
      const matchedTerms = cocktail.matchTerms.filter((term) =>
        normalizedQuery.includes(term.toLocaleLowerCase()),
      ).length;
      const score = Math.min(
        98,
        74 + matchedTerms * 4 + Math.max(0, 2 - index),
      );

      return { cocktail, score };
    })
    .sort((first, second) => second.score - first.score);
}
