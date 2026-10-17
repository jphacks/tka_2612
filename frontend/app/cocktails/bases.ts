// ベース酒（点の色分けと凡例に使う）。データにベース酒の項目はないので、材料から推定する
export const BASES = [
  { name: "ジン", color: "#7dd3fc" },
  { name: "ラム", color: "#fbbf24" },
  { name: "ウォッカ", color: "#e2e8f0" },
  { name: "テキーラ", color: "#a3e635" },
  { name: "ウイスキー", color: "#f97316" },
  { name: "ブランデー", color: "#f472b6" },
  { name: "和酒", color: "#818cf8" },
  { name: "ワイン・ビール", color: "#f87171" },
  { name: "リキュール", color: "#c084fc" },
  { name: "その他", color: "#64748b" },
] as const;

export type BaseName = (typeof BASES)[number]["name"];

// 名前にジンやブランデーを含むが、実際はリキュールのもの
const LIQUEUR_EXCEPTIONS = [
  "スロージン",
  "アプリコットブランデー",
  "チェリーブランデー",
  "ピーチブランデー",
  "プルネルブランデー",
];

// 名前にお酒の名前を含むが、お酒ではないもの
const NOT_ALCOHOL = ["ジンジャー", "クラムジュース", "マラスキーノチェリー"];

// 上から順に当てはめる（材料名にこの文字列を含めばそのベース酒とみなす）
const SPIRIT_RULES: { base: BaseName; keywords: string[] }[] = [
  { base: "ジン", keywords: ["ジン", "ジュネヴァ"] },
  { base: "ラム", keywords: ["ラム", "カシャッサ"] },
  { base: "ウォッカ", keywords: ["ウォッカ"] },
  { base: "テキーラ", keywords: ["テキーラ", "メスカル"] },
  { base: "ウイスキー", keywords: ["ウイスキー", "バーボン", "スコッチ"] },
  {
    base: "ブランデー",
    keywords: ["ブランデー", "コニャック", "カルバドス", "電気ブラン"],
  },
  { base: "和酒", keywords: ["焼酎", "日本酒", "泡盛"] },
];

const OTHER_RULES: { base: BaseName; keywords: string[] }[] = [
  {
    base: "ワイン・ビール",
    keywords: ["ワイン", "シャンパン", "シェリー", "ポートワイン", "ビール"],
  },
  {
    base: "リキュール",
    keywords: [
      "リキュール",
      "キュラソー",
      "コアントロー",
      "カンパリ",
      "アマレット",
      "シャルトリューズ",
      "アブサン",
      "ガリアーノ",
      "ドランブイ",
      "マラスキーノ",
      "ベルモット",
      "アクアビット",
      "カルーア",
      "グランマルニエ",
      "サザンカンフォート",
      "サンブーカ",
      "スーズ",
      "アドヴォカート",
      "カハナロイヤル",
      "ベイリーズ",
      "梅酒",
      "杏露酒",
      ...LIQUEUR_EXCEPTIONS,
    ],
  },
];

function match(
  ingredient: string,
  rules: { base: BaseName; keywords: string[] }[],
): BaseName | null {
  return (
    rules.find((r) => r.keywords.some((k) => ingredient.includes(k)))?.base ??
    null
  );
}

// 蒸留酒が入っていれば材料の並びで最初のものを、なければ醸造酒・リキュールをベースとみなす
export function estimateBase(ingredients: string[]): BaseName {
  const alcohols = ingredients.filter(
    (i) => !NOT_ALCOHOL.some((e) => i.includes(e)),
  );
  const spirits = alcohols.filter(
    (i) => !LIQUEUR_EXCEPTIONS.some((e) => i.includes(e)),
  );
  for (const ingredient of spirits) {
    const base = match(ingredient, SPIRIT_RULES);
    if (base) return base;
  }
  for (const ingredient of alcohols) {
    const base = match(ingredient, OTHER_RULES);
    if (base) return base;
  }
  return "その他";
}
