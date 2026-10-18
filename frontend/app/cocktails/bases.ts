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
// 明るい紙色の背景（app.css の --paper）の上で見分けやすい色にする
export const BASE_GROUPS = [
  { name: "ジン", color: "#3f7cc4", ids: ["gin"] },
  { name: "ラム", color: "#d99a26", ids: ["rum"] },
  { name: "ウォッカ", color: "#7b8796", ids: ["vodka"] },
  { name: "テキーラ", color: "#5f9a3c", ids: ["tequila"] },
  { name: "ウイスキー", color: "#8a5a36", ids: ["whisky"] },
  { name: "ブランデー", color: "#c94f86", ids: ["brandy"] },
  { name: "焼酎・日本酒", color: "#5b62c4", ids: ["shochu", "sake"] },
  { name: "ワイン・ビール", color: "#cf4a3f", ids: ["wine", "beer"] },
  {
    name: "その他の蒸留酒",
    color: "#a39587",
    ids: ["aquavit", "other-spirits"],
  },
  { name: "リキュール", color: "#8c5cc2", ids: ["liqueur"] },
  { name: "ノンアルコール", color: "#c7bbb0", ids: [] },
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
