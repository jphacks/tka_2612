// バックエンド API の呼び出し口。
// 今は mock で、データはサーバーのメモリ上に持つ（再起動で消える）。
// バックエンドができたら、各関数の中身を fetch に置き換える
import { MOCK_COCKTAILS, MOCK_MENU_LINES, type MockCocktail } from "./mock-data";
import type {
  Cocktail,
  RecommendResult,
  StoreStats,
  Vote,
} from "./types";

const TOP_N = 5;

// 店舗向け画面が空にならないよう、最初からいくつか入れておく
const votes = new Map<string, { up: number; down: number }>([
  ["cassis-orange", { up: 12, down: 2 }],
  ["mojito", { up: 9, down: 1 }],
  ["kahlua-milk", { up: 7, down: 3 }],
  ["gin-tonic", { up: 5, down: 4 }],
  ["spumoni", { up: 4, down: 1 }],
]);
const queries = new Map<string, number>([
  ["甘くてフルーティ", 8],
  ["さっぱりしたもの", 6],
  ["失恋を支えてくれるお酒", 3],
  ["度数が弱いもの", 2],
]);

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toCocktail({ keywords: _, ...cocktail }: MockCocktail): Cocktail {
  return cocktail;
}

// 名前から決まる小さな揺らぎ。同じ入力なら毎回同じ順位になる
function jitter(text: string) {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 1000;
  return (hash / 1000) * 0.04;
}

// 本物の API ではベクトルのコサイン類似度。mock ではキーワードの一致数で近似する
function mockScore(query: string, cocktail: MockCocktail) {
  const words = [...cocktail.keywords, ...cocktail.ingredients];
  const hits = words.filter((word) => query.includes(word)).length;
  return Math.min(0.97, 0.45 + hits * 0.15 + jitter(cocktail.name + query));
}

// メニューの1行から価格を除き、名前か別名が一致するお酒を探す
// （本物の API では OCR の結果をあいまい一致で照合する）
function matchMenuLine(line: string) {
  const name = line.replace(/[¥￥]\s?[\d,]+/g, "").trim();
  const cocktail = MOCK_COCKTAILS.find(
    (c) => c.name === name || c.aliases.includes(name),
  );
  return { name, cocktail };
}

export async function recommend(
  query: string,
  menuImage: File | null,
): Promise<RecommendResult> {
  await wait(800);
  queries.set(query, (queries.get(query) ?? 0) + 1);

  let candidates = MOCK_COCKTAILS;
  const unregistered: string[] = [];
  if (menuImage) {
    candidates = [];
    for (const line of MOCK_MENU_LINES) {
      const { name, cocktail } = matchMenuLine(line);
      if (cocktail) candidates.push(cocktail);
      else unregistered.push(name);
    }
  }

  const recommendations = candidates
    .map((cocktail) => ({
      cocktail: toCocktail(cocktail),
      score: mockScore(query, cocktail),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N);

  return {
    query,
    source: menuImage ? "menu" : "all",
    recommendations,
    unregistered,
  };
}

export async function sendFeedback(input: {
  cocktailId: string;
  vote: Vote;
  deviceId: string;
}) {
  await wait(200);
  const current = votes.get(input.cocktailId) ?? { up: 0, down: 0 };
  current[input.vote] += 1;
  votes.set(input.cocktailId, current);
}

export async function getStoreStats(): Promise<StoreStats> {
  await wait(200);
  const cocktails = MOCK_COCKTAILS.map((cocktail) => ({
    cocktail: toCocktail(cocktail),
    ...(votes.get(cocktail.id) ?? { up: 0, down: 0 }),
  }))
    .filter((stats) => stats.up + stats.down > 0)
    .sort((a, b) => b.up - a.up);

  const popularQueries = [...queries]
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { cocktails, popularQueries };
}
