import type { Cocktail } from "~/api/generated";
import { BASE_GROUPS, BASE_NAMES, baseGroupOf } from "~/cocktails/bases";

// ノンアルコールのグラスは、地図の灰色だと沈んで見えるので夕焼け色にする
const NON_ALCOHOLIC_DRINK_COLOR = "#ff8a5c";

// グラスに入ったお酒の色。地図の点と同じく、おもなベース（先頭）の色にする
export function drinkColor(cocktail: Cocktail): string {
  const group = baseGroupOf(cocktail.bases);
  if (group === "ノンアルコール") return NON_ALCOHOLIC_DRINK_COLOR;
  return BASE_GROUPS.find((g) => g.name === group)?.color ?? "#ffffff";
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
