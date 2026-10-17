import {
  type Cocktail,
  listCocktails,
  listCocktailVectors,
  searchCocktails,
} from "../api/generated";
import { type BaseName, estimateBase } from "./bases";

// 地図に描くお酒（API のお酒に、推定したベース酒とベクトルを付けたもの）
export type CocktailPoint = Cocktail & {
  base: BaseName;
  // 説明文の埋め込みベクトル（高次元）
  vector: number[];
};

// 検索 API は一致度の高い順に100件返す。そのうち、最も近いお酒から
// 一致度の差がこの値以内のものだけを「近い」とみなして集める
const SCORE_MARGIN = 0.06;
// UMAP で形が出るよう、最低限この件数は集める
const MIN_RESULTS = 30;

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
    return vector ? [{ ...c, base: estimateBase(c.ingredients), vector }] : [];
  });
}

// 入力文に近いお酒を検索し、一致度が近いものだけに絞る。失敗したら Error を投げる
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

  const results = res.data.results.filter((r) => pointsById.has(r.cocktail.id));
  const top = results[0]?.score ?? 0;
  const near = results.filter(
    (r, i) => i < MIN_RESULTS || r.score >= top - SCORE_MARGIN,
  );
  return {
    cocktails: near.flatMap((r) => pointsById.get(r.cocktail.id) ?? []),
    scores: near.map((r) => r.score),
  };
}
