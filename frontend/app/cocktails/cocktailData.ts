import {
  type Cocktail,
  listCocktails,
  listCocktailVectors,
  searchCocktails,
} from "~/api/generated";
import { type BaseGroupName, baseGroupOf } from "./bases";

// 地図に描くお酒（API のお酒に、色分けのグループとベクトルを付けたもの）
export type CocktailPoint = Cocktail & {
  baseGroup: BaseGroupName;
  // 説明文の埋め込みベクトル（高次元）
  vector: number[];
};

export type SearchHit = { cocktails: CocktailPoint[]; scores: number[] };

// 全件のお酒とベクトルを取得して組み合わせる
export async function fetchCocktailPoints(): Promise<CocktailPoint[]> {
  const [cocktailsRes, vectorsRes] = await Promise.all([
    listCocktails(),
    listCocktailVectors(),
  ]);
  if (cocktailsRes.status !== 200 || vectorsRes.status !== 200) {
    throw new Error("お酒のデータを取得できませんでした");
  }
  const vectors = new Map(vectorsRes.data.map((v) => [v.id, v.vector]));
  return cocktailsRes.data.flatMap((c) => {
    const vector = vectors.get(c.id);
    return vector ? [{ ...c, baseGroup: baseGroupOf(c.bases), vector }] : [];
  });
}

// 入力文に近いお酒を検索する（API が一致度の高い順に返す100件）。失敗したら Error を投げる
export async function searchNearby(
  text: string,
  pointsById: Map<string, CocktailPoint>,
): Promise<SearchHit> {
  const res = await searchCocktails({ text });
  if (res.status === 503) {
    throw new Error(
      "検索が混み合っているか、使えない状態です。少し待ってからもう一度お試しください",
    );
  }
  if (res.status !== 200) throw new Error("検索に失敗しました");

  // ベクトルを取得できていないお酒は地図に置けないので除く
  const results = res.data.results.filter((r) => pointsById.has(r.cocktail.id));
  return {
    cocktails: results.flatMap((r) => pointsById.get(r.cocktail.id) ?? []),
    scores: results.map((r) => r.score),
  };
}
