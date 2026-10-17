import { embedText } from "./embedding";
import { mulberry32 } from "./random";
import type { Cocktail } from "./types";

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

  const usedNames = new Set<string>();
  const cocktails: Cocktail[] = [];
  while (cocktails.length < count) {
    const base = pick(BASES).name;
    const name = `${pick(PREFIXES)}・${base}・${pick(STYLES)}`;
    if (usedNames.has(name)) continue;
    usedNames.add(name);

    const [ing1, ing2] = pickMany(INGREDIENTS, 2);
    const tastes = pickMany(TASTES, 2);
    const scene = pick(SCENES);
    const tags = [base, ing1, ing2, ...tastes, scene];
    cocktails.push({
      id: cocktails.length,
      name,
      base,
      abv: Math.round(5 + rand() * 30),
      description: `${base}をベースに${ing1}と${ing2}を合わせた一杯。${tastes[0]}で${tastes[1]}な味わいで、${scene}におすすめ。`,
      tags,
      // 定型文の部分で似てしまわないよう、説明文ではなく名前と特徴から作る
      embedding: embedText([name, ...tags].join(" ")),
    });
  }
  return cocktails;
}

export const mockCocktails = generateMockCocktails(1000);
