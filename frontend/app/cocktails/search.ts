import type { Cocktail } from "./types";

export type SearchResult = {
  // cocktails と同じ並びの関連度（0〜1）
  relevance: Float32Array;
  // 関連度が高い順の id
  ranking: number[];
};

// モックの検索。本番ではクエリを埋め込み、特徴量ベクトルとの類似度で置き換える想定。
// 文字 bigram の一致度でテキストスコアを出し、上位候補の周辺の点も関連度が上がるようにする
export function searchCocktails(
  query: string,
  cocktails: Cocktail[],
): SearchResult | null {
  const q = normalize(query);
  if (q.length === 0) return null;
  const queryGrams = bigrams(q);

  const textScores = cocktails.map((c) => {
    const haystack = normalize(
      [c.name, c.base, c.description, ...c.tags].join(" "),
    );
    let hits = 0;
    for (const g of queryGrams) if (haystack.includes(g)) hits++;
    const score = hits / queryGrams.size;
    return normalize(c.name).includes(q) ? score + 1 : score;
  });

  const maxText = Math.max(...textScores);
  if (maxText === 0) return null;

  // テキストスコア上位の重心を「クエリの位置」とみなす
  const top = textScores
    .map((score, i) => ({ score, i }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  const centroid = [0, 0];
  let weightSum = 0;
  for (const { score, i } of top) {
    for (let k = 0; k < 2; k++) centroid[k] += cocktails[i].vector[k] * score;
    weightSum += score;
  }
  for (let k = 0; k < 2; k++) centroid[k] /= weightSum;

  const sigma = 2.5;
  const relevance = new Float32Array(cocktails.length);
  cocktails.forEach((c, i) => {
    const d2 =
      (c.vector[0] - centroid[0]) ** 2 + (c.vector[1] - centroid[1]) ** 2;
    const proximity = Math.exp(-d2 / (2 * sigma * sigma));
    relevance[i] = 0.7 * (textScores[i] / maxText) + 0.3 * proximity;
  });

  const maxRelevance = Math.max(...relevance);
  for (let i = 0; i < relevance.length; i++) relevance[i] /= maxRelevance;

  const ranking = cocktails
    .map((c) => c.id)
    .sort((a, b) => relevance[b] - relevance[a]);
  return { relevance, ranking };
}

function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s・。、]/g, "");
}

function bigrams(text: string): Set<string> {
  if (text.length < 2) return new Set([text]);
  const grams = new Set<string>();
  for (let i = 0; i < text.length - 1; i++) grams.add(text.slice(i, i + 2));
  return grams;
}
