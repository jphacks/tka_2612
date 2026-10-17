// ベースのお酒の ID（API の Cocktail.bases）と名前。backend/data/bases.json と合わせる
export const BASE_NAMES: Record<string, string> = {
  whisky: "ウイスキー",
  vodka: "ウォッカ",
  gin: "ジン",
  tequila: "テキーラ",
  brandy: "ブランデー",
  rum: "ラム",
  aquavit: "アクアビット",
  shochu: "焼酎",
  "other-spirits": "その他の蒸留酒",
  sake: "日本酒",
  beer: "ビール",
  wine: "ワイン",
  liqueur: "リキュール",
};

// 点の色分けと凡例。13種類だと見分けにくいので、件数の少ないものはまとめる
export const BASE_GROUPS = [
  { name: "ジン", color: "#7dd3fc", ids: ["gin"] },
  { name: "ラム", color: "#fbbf24", ids: ["rum"] },
  { name: "ウォッカ", color: "#e2e8f0", ids: ["vodka"] },
  { name: "テキーラ", color: "#a3e635", ids: ["tequila"] },
  { name: "ウイスキー", color: "#f97316", ids: ["whisky"] },
  { name: "ブランデー", color: "#f472b6", ids: ["brandy"] },
  { name: "焼酎・日本酒", color: "#818cf8", ids: ["shochu", "sake"] },
  { name: "ワイン・ビール", color: "#f87171", ids: ["wine", "beer"] },
  {
    name: "その他の蒸留酒",
    color: "#94a3b8",
    ids: ["aquavit", "other-spirits"],
  },
  { name: "リキュール", color: "#c084fc", ids: ["liqueur"] },
  { name: "ノンアルコール", color: "#475569", ids: [] },
] as const;

export type BaseGroupName = (typeof BASE_GROUPS)[number]["name"];

// 色分けのグループ。ベースが複数あるときは先頭（おもなベース）で決める
export function baseGroupOf(bases: string[]): BaseGroupName {
  if (bases.length === 0) return "ノンアルコール";
  const group = BASE_GROUPS.find((g) =>
    (g.ids as readonly string[]).includes(bases[0]),
  );
  // 知らない ID（データにベースが増えたときなど）は「その他の蒸留酒」に入れる
  return group?.name ?? "その他の蒸留酒";
}

// 表示用のベースの名前（例: ジン・リキュール）
export function baseLabel(bases: string[]): string {
  if (bases.length === 0) return "ノンアルコール";
  return bases.map((id) => BASE_NAMES[id] ?? id).join("・");
}
