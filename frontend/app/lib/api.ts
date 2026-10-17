// バックエンド API の呼び出し口。型は backend/openapi.json に合わせる
// 開発中は Vite のプロキシで /api をバックエンドに転送する（vite.config.ts）

export type Cocktail = {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  ingredients: string[];
};

export type Recommendation = {
  cocktail: Cocktail;
  score: number;
};

export type RecommendResponse = {
  query: string;
  recommendations: Recommendation[];
  unregistered: string[];
};

export async function recommend(
  query: string,
  image: File | null,
): Promise<RecommendResponse> {
  const form = new FormData();
  form.append("query", query);
  if (image) form.append("image", image);

  const res = await fetch("/api/recommendations", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new Error(`おすすめの取得に失敗しました（${res.status}）`);
  }
  return res.json();
}
