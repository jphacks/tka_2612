import type { Cocktail, Vec3 } from "./types";

// バックエンドができるまでのモックデータ。
// SSR とクライアントで同じデータになるよう、シード付き乱数で決定的に生成する

export const BASES = [
  { name: "ジン", color: "#7dd3fc" },
  { name: "ラム", color: "#fbbf24" },
  { name: "ウォッカ", color: "#e2e8f0" },
  { name: "テキーラ", color: "#a3e635" },
  { name: "ウイスキー", color: "#f97316" },
  { name: "ブランデー", color: "#f472b6" },
  { name: "リキュール", color: "#c084fc" },
  { name: "ワイン", color: "#f87171" },
] as const;

const PREFIXES = [
  "ミッドナイト",
  "サンセット",
  "ブルー",
  "ゴールデン",
  "シルバー",
  "ルビー",
  "トロピカル",
  "フローズン",
  "スモーキー",
  "ベルベット",
  "ムーンライト",
  "オーシャン",
  "ローズ",
  "ハニー",
  "ワイルド",
  "ロイヤル",
  "クラシック",
  "スパイシー",
  "シトラス",
  "チェリー",
  "エメラルド",
  "ノーザン",
];

const STYLES = [
  "フィズ",
  "サワー",
  "スプリッツ",
  "ハイボール",
  "マティーニ",
  "コリンズ",
  "ミュール",
  "ジュレップ",
  "スマッシュ",
  "トニック",
  "リッキー",
  "フリップ",
  "パンチ",
  "ブリーズ",
  "サンライズ",
  "コブラー",
];

const INGREDIENTS = [
  "ライム",
  "レモン",
  "オレンジ",
  "グレープフルーツ",
  "ミント",
  "ジンジャーエール",
  "トニックウォーター",
  "ソーダ",
  "クランベリー",
  "パイナップル",
  "ココナッツミルク",
  "コーヒー",
  "はちみつ",
  "シナモン",
  "ベリー",
  "桃",
  "青りんご",
  "ハーブ",
];

const TASTES = [
  "甘め",
  "さっぱり",
  "すっきり",
  "フルーティー",
  "ほろ苦い",
  "スパイシー",
  "クリーミー",
  "爽やか",
  "濃厚",
  "華やか",
];

const SCENES = [
  "一杯目",
  "食後",
  "暑い夏の夜",
  "ゆっくり語りたい夜",
  "お酒に弱い人",
  "しっかり酔いたい日",
  "デート",
  "締めの一杯",
];

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateMockCocktails(count: number, seed = 2612): Cocktail[] {
  const rand = mulberry32(seed);
  const pick = <T>(items: readonly T[]): T =>
    items[Math.floor(rand() * items.length)];
  const pickMany = <T>(items: readonly T[], n: number): T[] => {
    const pool = [...items];
    const result: T[] = [];
    for (let i = 0; i < n && pool.length > 0; i++) {
      result.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    }
    return result;
  };
  const gaussian = () => {
    const u = Math.max(rand(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };

  // ベース酒ごとにクラスタの中心を球面上に散らし、点群に構造を持たせる
  const centers: Vec3[] = BASES.map((_, i) => {
    const y = 1 - (2 * (i + 0.5)) / BASES.length;
    const r = Math.sqrt(1 - y * y);
    const theta = i * Math.PI * (3 - Math.sqrt(5));
    const radius = 7;
    return [
      Math.cos(theta) * r * radius,
      y * radius,
      Math.sin(theta) * r * radius,
    ];
  });

  const usedNames = new Set<string>();
  const cocktails: Cocktail[] = [];
  while (cocktails.length < count) {
    const baseIndex = Math.floor(rand() * BASES.length);
    const base = BASES[baseIndex].name;
    const name = `${pick(PREFIXES)}・${base}・${pick(STYLES)}`;
    if (usedNames.has(name)) continue;
    usedNames.add(name);

    const [ing1, ing2] = pickMany(INGREDIENTS, 2);
    const tastes = pickMany(TASTES, 2);
    const scene = pick(SCENES);
    const center = centers[baseIndex];
    const spread = 1.8;
    cocktails.push({
      id: cocktails.length,
      name,
      base,
      abv: Math.round(5 + rand() * 30),
      description: `${base}をベースに${ing1}と${ing2}を合わせた一杯。${tastes[0]}で${tastes[1]}な味わいで、${scene}におすすめ。`,
      tags: [base, ing1, ing2, ...tastes],
      vector: [
        center[0] + gaussian() * spread,
        center[1] + gaussian() * spread,
        center[2] + gaussian() * spread,
      ],
    });
  }
  return cocktails;
}

export const mockCocktails = generateMockCocktails(1000);
