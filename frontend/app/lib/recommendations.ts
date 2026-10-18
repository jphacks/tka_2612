import { type Cocktail, matchMenu, recommend } from "~/api/generated";
import type { RecommendationSession } from "./recommendation-session";

const RESULTS_KEY = "cocktail-tasukeru.recommendation-results";

export type RecommendationEntry = {
  cocktail: Cocktail;
  // 入力文との相性。気分の入力がなく、相性を計算していないときは null
  score: number | null;
  // メニューの写真で、このお酒が書かれていた行（写真なし・不明なら null）
  menuText: string | null;
};

export type RecommendationResults = {
  sessionId: string;
  recommendations: RecommendationEntry[];
  unregistered: string[];
  // menu: メニュー内から / all: 写真なしで全体から / fallback: メニューのお酒を特定できず全体から
  source: "menu" | "all" | "fallback";
};

const RECOMMEND_ERRORS: Record<number, string> = {
  503: "おすすめの計算が混み合っています。少し待ってからもう一度お試しください。",
};

// 写真から読み取った名前をデータベースのお酒と照合し、その中から入力文に合うお酒を選ぶ
async function fetchRecommendations(
  session: RecommendationSession,
): Promise<RecommendationResults> {
  const names = session.recognizedMenuItems?.map(({ text }) => text) ?? [];
  const menuTextById = new Map<string, string>();
  const menuCocktails: Cocktail[] = [];
  let unregistered: string[] = [];

  if (names.length > 0) {
    const matched = await matchMenu({ names });
    if (matched.status !== 200) {
      throw new Error("メニューのお酒を照合できませんでした。");
    }
    for (const { name, cocktail } of matched.data.matched) {
      menuTextById.set(cocktail.id, name);
      menuCocktails.push(cocktail);
    }
    unregistered = matched.data.unregistered;
  }

  const source: RecommendationResults["source"] = !session.menuImage
    ? "all"
    : menuTextById.size > 0
      ? "menu"
      : "fallback";

  // 気分の入力がないときは、相性を計算できないので、メニューに載っていた順に並べる。
  // （おすすめ API は入力文を店舗向けの集計に記録するので、代わりの文を入れて呼ばない）
  if (session.query === "") {
    return {
      sessionId: session.id,
      recommendations: menuCocktails.map((cocktail) => ({
        cocktail,
        score: null,
        menuText: menuTextById.get(cocktail.id) ?? null,
      })),
      unregistered,
      source,
    };
  }

  const response = await recommend({
    query: session.query,
    cocktail_ids: source === "menu" ? [...menuTextById.keys()] : null,
  });
  if (response.status !== 200) {
    throw new Error(
      RECOMMEND_ERRORS[response.status] ?? "おすすめを取得できませんでした。",
    );
  }

  return {
    sessionId: session.id,
    recommendations: response.data.recommendations.map(
      ({ cocktail, score }) => ({
        cocktail,
        score,
        menuText: menuTextById.get(cocktail.id) ?? null,
      }),
    ),
    unregistered,
    source,
  };
}

function isRecommendationResults(
  value: unknown,
): value is RecommendationResults {
  return (
    typeof value === "object" &&
    value !== null &&
    "sessionId" in value &&
    typeof value.sessionId === "string" &&
    "recommendations" in value &&
    Array.isArray(value.recommendations) &&
    "unregistered" in value &&
    Array.isArray(value.unregistered) &&
    "source" in value &&
    typeof value.source === "string"
  );
}

// 保存してあるこの検索の結果。なければ null
export function loadRecommendationResults(
  sessionId: string,
): RecommendationResults | null {
  const serialized = sessionStorage.getItem(RESULTS_KEY);
  if (!serialized) return null;
  const value: unknown = JSON.parse(serialized);
  return isRecommendationResults(value) && value.sessionId === sessionId
    ? value
    : null;
}

// この検索の結果を返す。保存してあればそれを使い、API を呼び直さない
// （再読み込みのたびに入力文が店舗向けの集計に数えられないようにするため）
export async function getRecommendationResults(
  session: RecommendationSession,
): Promise<RecommendationResults> {
  const saved = loadRecommendationResults(session.id);
  if (saved) return saved;
  const results = await fetchRecommendations(session);
  sessionStorage.setItem(RESULTS_KEY, JSON.stringify(results));
  return results;
}
