import { cosineSimilarity, embedText } from "./embedding";
import type { Cocktail } from "./types";

// この類似度以上のカクテルを「近い」とみなして集める
const SIMILARITY_THRESHOLD = 0.2;
// UMAP で形が出るよう最低限の件数は集め、計算が重くならないよう上限も設ける
const MIN_RESULTS = 30;
const MAX_RESULTS = 300;

export type SearchResult = {
  // 類似度の高い順に並べた、入力に近いカクテル
  cocktails: Cocktail[];
  // cocktails と同じ並びの関連度（最も近いものを 1 とする）
  relevance: Float32Array;
};

// 入力を埋め込み、特徴量ベクトルが近いカクテルだけを集める。
// 何も入力されていないか、近いカクテルが1件もなければ null
export function searchCocktails(
  query: string,
  cocktails: Cocktail[],
): SearchResult | null {
  if (query.trim() === "") return null;
  const queryVector = embedText(query);

  const scored = cocktails
    .map((cocktail) => ({
      cocktail,
      similarity: cosineSimilarity(queryVector, cocktail.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity);
  const top = scored[0]?.similarity ?? 0;
  if (top < SIMILARITY_THRESHOLD) return null;

  const nearCount = scored.filter(
    (s) => s.similarity >= SIMILARITY_THRESHOLD,
  ).length;
  const hits = scored.slice(
    0,
    Math.min(Math.max(nearCount, MIN_RESULTS), MAX_RESULTS),
  );
  return {
    cocktails: hits.map((s) => s.cocktail),
    relevance: Float32Array.from(hits, (s) => Math.max(s.similarity / top, 0)),
  };
}
