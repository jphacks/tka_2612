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

// 点の色分けと凡例。13種類だと見分けにくいので、件数の少ないものはまとめる。
// 夜の背景（app.css の --night）の上で光って見える色にする
export const BASE_GROUPS = [
  { name: "ジン", color: "#7cd3ff", ids: ["gin"] },
  { name: "ラム", color: "#ffc35c", ids: ["rum"] },
  { name: "ウォッカ", color: "#c9d6ff", ids: ["vodka"] },
  { name: "テキーラ", color: "#a8ff7a", ids: ["tequila"] },
  { name: "ウイスキー", color: "#ff9b5c", ids: ["whisky"] },
  { name: "ブランデー", color: "#ff7eb6", ids: ["brandy"] },
  { name: "焼酎・日本酒", color: "#9d8cff", ids: ["shochu", "sake"] },
  { name: "ワイン・ビール", color: "#ff5f7e", ids: ["wine", "beer"] },
  {
    name: "その他の蒸留酒",
    color: "#b9b3c9",
    ids: ["aquavit", "other-spirits"],
  },
  { name: "リキュール", color: "#e07bff", ids: ["liqueur"] },
  { name: "ノンアルコール", color: "#7d7891", ids: [] },
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
