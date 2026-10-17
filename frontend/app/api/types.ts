// バックエンド API とやり取りするデータの型。
// mock と本物の API で同じ型を使い、差し替えても画面側を変えずに済むようにする

export type Cocktail = {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  ingredients: string[];
};

export type Recommendation = {
  cocktail: Cocktail;
  // 一致度（コサイン類似度。0〜1）
  score: number;
};

export type RecommendResult = {
  query: string;
  // メニュー写真あり: メニュー内から推薦 / なし: データベース全体から推薦
  source: "menu" | "all";
  recommendations: Recommendation[];
  // メニュー写真から読み取れたが、データベースに登録されていないお酒
  unregistered: string[];
};

export type Vote = "up" | "down";

export type CocktailStats = {
  cocktail: Cocktail;
  up: number;
  down: number;
};

export type StoreStats = {
  cocktails: CocktailStats[];
  popularQueries: { query: string; count: number }[];
};
