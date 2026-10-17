// モックの埋め込み。本番ではバックエンドの埋め込みモデルに置き換える想定。
// 文字と2文字の組を次元にハッシュして数え、長さ 1 に正規化する。
// 同じ言葉を含む文ほどベクトルが近くなる
export const EMBEDDING_DIM = 256;

export function embedText(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIM).fill(0);
  for (const word of normalize(text).split(/\s+/)) {
    for (let i = 0; i < word.length; i++) {
      addFeature(vector, word[i], 0.5);
      if (i + 1 < word.length) addFeature(vector, word.slice(i, i + 2), 1);
    }
  }
  const norm = Math.hypot(...vector);
  return norm === 0 ? vector : vector.map((v) => v / norm);
}

// どちらも長さ 1 なので内積がコサイン類似度になる
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[・。、,.!?！？]/g, " ")
    .trim();
}

function addFeature(vector: number[], feature: string, weight: number) {
  const hash = fnv1a(feature);
  // 符号もハッシュで決め、ほかの特徴と同じ次元に入ったときの偏りを打ち消す
  const sign = hash & 0x80000000 ? -1 : 1;
  vector[hash % EMBEDDING_DIM] += sign * weight;
}

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
