import { locateMenuItems, matchMenu, scanMenu } from "~/api/generated";

// 写真から読み取ったメニューを、データベースのお酒と照合した結果
export type MenuMatch = {
  // 照合できたお酒と、メニューに書かれていた名前
  matched: { cocktailId: string; text: string }[];
  // 読み取れたが、データベースにないお酒の名前
  unregistered: string[];
};

export type MenuPosition = { x: number; y: number };

const SCAN_ERRORS: Record<number, string> = {
  413: "画像が大きすぎます。10MB までの画像を選んでください。",
  415: "画像ファイルを選んでください。",
  503: "メニューの読み取りが混み合っています。少し待ってからもう一度お試しください。",
};

// メニューの写真から名前を読み取り、そのままデータベースのお酒と照合する。
// API キーをブラウザに渡さないよう、Gemini はバックエンド経由で呼ぶ。
// 速くするため、ここでは位置は求めない（おすすめが決まってから locateOnMenu で求める）
export async function analyzeMenuImage(file: File): Promise<MenuMatch> {
  const scanned = await scanMenu({ image: file });
  if (scanned.status !== 200) {
    throw new Error(
      SCAN_ERRORS[scanned.status] ?? "メニュー画像の読み取りに失敗しました。",
    );
  }
  if (scanned.data.names.length === 0) {
    return { matched: [], unregistered: [] };
  }

  const matched = await matchMenu({ names: scanned.data.names });
  if (matched.status !== 200) {
    throw new Error("メニューのお酒を照合できませんでした。");
  }
  return {
    matched: matched.data.matched.map(({ name, cocktail }) => ({
      cocktailId: cocktail.id,
      text: name,
    })),
    unregistered: matched.data.unregistered,
  };
}

// メニューの写真（data URL）の中で、指定した名前が書かれている位置を求める（見つからない名前は含まない）
export async function locateOnMenu(
  image: string,
  texts: string[],
): Promise<Map<string, MenuPosition>> {
  const positions = new Map<string, MenuPosition>();
  if (texts.length === 0) return positions;

  const response = await locateMenuItems({ image, names: texts });
  if (response.status !== 200) {
    throw new Error("メニュー上の位置を求められませんでした。");
  }
  for (const { name, x, y } of response.data.items) {
    if (x !== null && y !== null) positions.set(name, { x, y });
  }
  return positions;
}
