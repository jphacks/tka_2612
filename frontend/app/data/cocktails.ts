import type { RecognizedMenuItem } from "~/lib/ocr";

export type Cocktail = {
  id: string;
  name: string;
  englishName: string;
  aliases: string[];
  description: string;
  ingredients: string[];
  tags: string[];
  color: string;
  matchTerms: string[];
  detail: string;
};

export type Recommendation = {
  cocktail: Cocktail;
  score: number;
};

export const cocktails: Cocktail[] = [
  {
    id: "mojito",
    name: "モヒート",
    englishName: "Mojito",
    aliases: ["Mojito"],
    description:
      "ミントとライムの香りが広がる、爽やかでさっぱりした味わい。暑い日にぴったり。",
    ingredients: ["ホワイトラム", "ミント", "ライム", "砂糖", "ソーダ"],
    tags: ["さっぱり", "爽やか"],
    color: "mint",
    matchTerms: [
      "さっぱり",
      "爽やか",
      "ミント",
      "ライム",
      "夏",
      "暑",
      "雨上がり",
    ],
    detail:
      "ラムにミント、ライム、ソーダを合わせたキューバ生まれのカクテル。ミントの清涼感とライムの酸味で、気分をリフレッシュしたい夜におすすめです。",
  },
  {
    id: "cassis-orange",
    name: "カシスオレンジ",
    englishName: "Cassis Orange",
    aliases: ["Cassis Orange", "カシオレ"],
    description:
      "カシスの甘酸っぱさとオレンジのフルーティさ。アルコール感が弱く飲みやすい。",
    ingredients: ["カシスリキュール", "オレンジジュース"],
    tags: ["甘口", "フルーティー"],
    color: "cassis",
    matchTerms: [
      "甘",
      "フルーティ",
      "フルーツ",
      "オレンジ",
      "飲みやす",
      "初心者",
    ],
    detail:
      "カシスの深い甘みをオレンジジュースで軽やかに仕上げた、カクテルの定番。甘酸っぱく親しみやすい味わいで、初めての一杯にもおすすめです。",
  },
  {
    id: "gin-tonic",
    name: "ジントニック",
    englishName: "Gin and Tonic",
    aliases: ["Gin and Tonic", "ジントニ"],
    description:
      "ジンの香りとトニックのほろ苦さ。すっきりしていて、どんな料理にも合う定番。",
    ingredients: ["ジン", "トニックウォーター", "ライム"],
    tags: ["すっきり", "定番"],
    color: "mint",
    matchTerms: ["さっぱり", "すっきり", "苦", "爽やか", "定番"],
    detail:
      "ジンのボタニカルな香りにトニックウォーターのほろ苦さを重ねた定番カクテル。食事にも合わせやすい、すっきりした味わいです。",
  },
  {
    id: "martini",
    name: "マティーニ",
    englishName: "Martini",
    aliases: ["Martini"],
    description:
      "ジンとドライベルモットだけで作る、キリッと辛口で度数の強い大人の一杯。",
    ingredients: ["ジン", "ドライベルモット", "オリーブ"],
    tags: ["辛口", "ドライ"],
    color: "blue",
    matchTerms: ["強", "辛口", "ドライ", "大人", "夜"],
    detail:
      "ジンとドライベルモットを合わせた、シャープで奥行きのある味わい。オリーブの香りがアクセントになる、クラシックな一杯です。",
  },
  {
    id: "kahlua-milk",
    name: "カルーアミルク",
    englishName: "Kahlua Milk",
    aliases: ["Kahlua Milk"],
    description:
      "コーヒーリキュールと牛乳の、まろやかでやさしい甘さ。デザート感覚で飲める。",
    ingredients: ["コーヒーリキュール", "牛乳"],
    tags: ["甘口", "クリーミー"],
    color: "coffee",
    matchTerms: [
      "甘",
      "クリーミー",
      "まろやか",
      "やさしい",
      "コーヒー",
      "デザート",
      "失恋",
      "慰め",
      "疲れ",
    ],
    detail:
      "コーヒーの香ばしさとミルクのやさしい口当たりが楽しめる、デザートのようなカクテル。苦味と甘みのバランスがよく、ゆっくり過ごしたいときに。",
  },
  {
    id: "salty-dog",
    name: "ソルティドッグ",
    englishName: "Salty Dog",
    aliases: ["Salty Dog"],
    description:
      "グラスの縁の塩が、グレープフルーツのほろ苦さと酸味を引き立てる。",
    ingredients: ["ウォッカ", "グレープフルーツジュース", "塩"],
    tags: ["さっぱり", "柑橘"],
    color: "peach",
    matchTerms: [
      "さっぱり",
      "フルーティ",
      "グレープフルーツ",
      "苦",
      "しょっぱ",
    ],
    detail:
      "グレープフルーツの酸味とほろ苦さを、グラスの縁の塩が引き立てます。すっきりした柑橘系が飲みたいときにぴったりです。",
  },
  {
    id: "spumoni",
    name: "スプモーニ",
    englishName: "Spumoni",
    aliases: ["Spumoni"],
    description:
      "カンパリのほろ苦さとグレープフルーツの爽やかさ。少し切ない大人の味。",
    ingredients: ["カンパリ", "グレープフルーツジュース", "トニックウォーター"],
    tags: ["ほろ苦い", "爽やか"],
    color: "peach",
    matchTerms: [
      "苦",
      "フルーティ",
      "爽やか",
      "グレープフルーツ",
      "失恋",
      "切な",
    ],
    detail:
      "カンパリのほろ苦さ、グレープフルーツの酸味、トニックの泡が重なるイタリア生まれのカクテル。ほろ苦い余韻を楽しみたい方へ。",
  },
  {
    id: "margarita",
    name: "マルガリータ",
    englishName: "Margarita",
    aliases: ["Margarita"],
    description:
      "テキーラとライムの鮮烈な酸味に、縁の塩がアクセント。パーティの主役。",
    ingredients: ["テキーラ", "ホワイトキュラソー", "ライム", "塩"],
    tags: ["酸味", "華やか"],
    color: "blue",
    matchTerms: ["酸", "強", "ライム", "祝", "パーティ", "テンション"],
    detail:
      "テキーラとライムのきりっとした酸味に、グラスの縁の塩がアクセント。華やかな場面や気分を上げたい夜によく合います。",
  },
  {
    id: "pina-colada",
    name: "ピニャコラーダ",
    englishName: "Piña Colada",
    aliases: ["Piña Colada", "Pina Colada"],
    description:
      "パイナップルとココナッツの濃厚な甘さ。南国気分になれるトロピカルな一杯。",
    ingredients: ["ホワイトラム", "パイナップルジュース", "ココナッツミルク"],
    tags: ["甘口", "トロピカル"],
    color: "peach",
    matchTerms: [
      "甘",
      "フルーティ",
      "フルーツ",
      "トロピカル",
      "南国",
      "クリーミー",
      "夏",
    ],
    detail:
      "ラムにパイナップルとココナッツを合わせた、南国生まれのクリーミーなカクテル。トロピカルな甘さを楽しみたいときに。",
  },
  {
    id: "fuzzy-navel",
    name: "ファジーネーブル",
    englishName: "Fuzzy Navel",
    aliases: ["Fuzzy Navel"],
    description: "桃とオレンジのジューシーな甘さ。ジュースのように飲みやすい。",
    ingredients: ["ピーチリキュール", "オレンジジュース"],
    tags: ["甘口", "ピーチ"],
    color: "peach",
    matchTerms: [
      "甘",
      "フルーティ",
      "フルーツ",
      "桃",
      "ピーチ",
      "オレンジ",
      "飲みやす",
      "初心者",
    ],
    detail:
      "桃の香りが豊かなピーチリキュールとオレンジジュースを合わせた、まろやかなカクテル。アルコール感が穏やかで、デザート感覚で楽しめます。",
  },
  {
    id: "moscow-mule",
    name: "モスコミュール",
    englishName: "Moscow Mule",
    aliases: ["Moscow Mule"],
    description:
      "ジンジャーのピリッとした刺激とライムの爽快感。元気を出したい日に。",
    ingredients: ["ウォッカ", "ジンジャービア", "ライム"],
    tags: ["爽快", "スパイシー"],
    color: "mint",
    matchTerms: [
      "さっぱり",
      "爽やか",
      "ジンジャー",
      "生姜",
      "元気",
      "雨上がり",
    ],
    detail:
      "ウォッカにジンジャーの刺激とライムの爽快感を合わせたカクテル。気分を切り替えたいときや、すっきりした一杯が欲しい日に。",
  },
  {
    id: "cosmopolitan",
    name: "コスモポリタン",
    englishName: "Cosmopolitan",
    aliases: ["Cosmopolitan"],
    description:
      "クランベリーの甘酸っぱさが華やかな、ピンク色のおしゃれなカクテル。",
    ingredients: [
      "ウォッカ",
      "ホワイトキュラソー",
      "クランベリージュース",
      "ライム",
    ],
    tags: ["甘酸っぱい", "華やか"],
    color: "cassis",
    matchTerms: [
      "フルーティ",
      "甘酸っぱ",
      "華やか",
      "おしゃれ",
      "祝",
      "デート",
    ],
    detail:
      "クランベリーの甘酸っぱさと柑橘の香りが調和した、鮮やかな色合いの一杯。華やかな気分を楽しみたい夜におすすめです。",
  },
  {
    id: "irish-coffee",
    name: "アイリッシュコーヒー",
    englishName: "Irish Coffee",
    aliases: ["Irish Coffee"],
    description:
      "温かいコーヒーにウイスキーと生クリーム。冷えた体と心をじんわり温める。",
    ingredients: ["アイリッシュウイスキー", "コーヒー", "砂糖", "生クリーム"],
    tags: ["ホット", "クリーミー"],
    color: "coffee",
    matchTerms: [
      "温か",
      "ホット",
      "コーヒー",
      "寒",
      "雨",
      "慰め",
      "失恋",
      "疲れ",
    ],
    detail:
      "温かいコーヒーにウイスキーと生クリームを重ねたホットカクテル。冷えた夜や、心をゆっくり休めたいときに。",
  },
  {
    id: "mimosa",
    name: "ミモザ",
    englishName: "Mimosa",
    aliases: ["Mimosa"],
    description:
      "シャンパンとオレンジジュースの軽やかな一杯。お祝いや乾杯にぴったり。",
    ingredients: ["シャンパン", "オレンジジュース"],
    tags: ["軽やか", "華やか"],
    color: "peach",
    matchTerms: ["フルーティ", "オレンジ", "華やか", "祝", "乾杯", "軽"],
    detail:
      "シャンパンの繊細な泡とオレンジジュースの果実感が楽しめる軽やかなカクテル。乾杯やお祝いの席にもよく合います。",
  },
  {
    id: "china-blue",
    name: "チャイナブルー",
    englishName: "China Blue",
    aliases: ["China Blue"],
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
    detail:
      "ライチの華やかな香りとグレープフルーツのほろ苦さが調和した、青い色合いも美しい一杯。すっきりした後味が好きな方にぴったりです。",
  },
];

function stableJitter(text: string): number {
  let hash = 0;
  for (const character of text) {
    hash = (hash * 31 + character.charCodeAt(0)) % 1000;
  }
  return (hash / 1000) * 0.04;
}

// 入力文に含まれる語が、お酒の特徴語・材料にいくつ当てはまるかで相性を出す
export function scoreCocktail(cocktail: Cocktail, query: string): number {
  const normalizedQuery = query.toLocaleLowerCase();
  const searchableTerms = [...cocktail.matchTerms, ...cocktail.ingredients];
  const matchedTerms = searchableTerms.filter((term) =>
    normalizedQuery.includes(term.toLocaleLowerCase()),
  ).length;
  return Math.min(
    0.97,
    0.45 + matchedTerms * 0.15 + stableJitter(cocktail.name + normalizedQuery),
  );
}

function normalizeMenuText(text: string): string {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function getMenuItemName(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/(?:¥\s*[\d,]+|\s+[\d,]+\s*円?)\s*$/u, "")
    .trim();
}

// メニューの1行に、このお酒の名前・英名・別名のどれかが含まれているか
function matchesMenuText(cocktail: Cocktail, text: string): boolean {
  const normalizedLine = normalizeMenuText(getMenuItemName(text));
  if (!normalizedLine) return false;
  return [cocktail.name, cocktail.englishName, ...cocktail.aliases]
    .map(normalizeMenuText)
    .some((name) => name.length > 0 && normalizedLine.includes(name));
}

export function findRecognizedMenuItem(
  cocktail: Cocktail,
  menuItems: RecognizedMenuItem[] | null,
): RecognizedMenuItem | undefined {
  return menuItems?.find(({ text }) => matchesMenuText(cocktail, text));
}

export type RecommendationResult = {
  recommendations: Recommendation[];
  unregistered: string[];
  source: "menu" | "all" | "fallback";
};

export function recommendCocktails(
  query: string,
  menuItems: RecognizedMenuItem[] | null,
): RecommendationResult {
  let candidates = cocktails;
  const unregistered: string[] = [];
  let source: RecommendationResult["source"] = "all";

  if (menuItems) {
    const matched = new Set<Cocktail>();
    for (const { text } of menuItems) {
      const cocktail = cocktails.find((candidate) =>
        matchesMenuText(candidate, text),
      );
      if (cocktail) {
        matched.add(cocktail);
      } else {
        const name = getMenuItemName(text);
        if (name && !unregistered.includes(name)) unregistered.push(name);
      }
    }

    if (matched.size > 0) {
      candidates = [...matched];
      source = "menu";
    } else {
      source = "fallback";
    }
  }

  const recommendations = candidates
    .map((cocktail, index) => ({
      cocktail,
      score: scoreCocktail(cocktail, query),
      index,
    }))
    .sort(
      (first, second) =>
        second.score - first.score || first.index - second.index,
    )
    .slice(0, 5)
    .map(({ cocktail, score }) => ({ cocktail, score }));

  return {
    recommendations,
    unregistered,
    source,
  };
}
