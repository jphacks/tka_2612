import type { Cocktail } from "~/api/generated";
import { BASE_NAMES } from "~/cocktails/bases";

// カードのグラスの色（app.css の .cocktail-art-<色>）。おもなベース（先頭）で決める
const BASE_COLORS: Record<string, string> = {
  gin: "blue",
  vodka: "blue",
  aquavit: "blue",
  "other-spirits": "blue",
  rum: "mint",
  tequila: "mint",
  whisky: "coffee",
  brandy: "coffee",
  shochu: "coffee",
  sake: "coffee",
  wine: "peach",
  beer: "peach",
  liqueur: "cassis",
};

export function cardColor(cocktail: Cocktail): string {
  return BASE_COLORS[cocktail.bases[0]] ?? "peach";
}

// 英語の表記（別名のうち、最初の英字だけのもの）。なければ空
export function englishName(cocktail: Cocktail): string {
  return cocktail.aliases.find((alias) => /^[\x20-\x7E]+$/.test(alias)) ?? "";
}

// タグとしてベースのお酒の名前を出す（例: ジン、リキュール）
export function baseTags(cocktail: Cocktail): string[] {
  if (cocktail.bases.length === 0) return ["ノンアルコール"];
  return cocktail.bases.map((id) => BASE_NAMES[id] ?? id);
}
