import { type Cocktail, getCocktail, recommend } from "~/api/generated";
import { locateOnMenu } from "./ocr";
import type { RecommendationSession } from "./recommendation-session";

const RESULTS_KEY = "cocktail-tasukeru.recommendation-results";

export type RecommendationEntry = {
  cocktail: Cocktail;
  // 入力文との相性。気分の入力がなく、相性を計算していないときは null
  score: number | null;
  // メニューの写真で、このお酒が書かれていた名前（写真なし・メニュー外なら null）
  menuText: string | null;
  // メニューの写真上の位置（写真の幅・高さに対する %）。求めていない・見つからないなら null
  x: number | null;
  y: number | null;
};

export type RecommendationResults = {
  sessionId: string;
  recommendations: RecommendationEntry[];
  unregistered: string[];
  // menu: メニュー内から / all: 写真なしで全体から / fallback: メニューのお酒を特定できず全体から
  source: "menu" | "all" | "fallback";
  // メニュー上の位置を求め終えたか（求める必要がないときも true）
  positionsLocated: boolean;
};

// 一度に位置を求められるお酒の数（POST /menu/locate の上限）
const LOCATE_LIMIT = 10;

const RECOMMEND_ERRORS: Record<number, string> = {
  503: "おすすめの計算が混み合っています。少し待ってからもう一度お試しください。",
};

// 写真を選んだときに照合したメニューのお酒の中から、入力文に合うお酒を選ぶ
async function fetchRecommendations(
  session: RecommendationSession,
): Promise<RecommendationResults> {
  const menuTextById = new Map(
    session.menuMatch?.matched.map(({ cocktailId, text }) => [
      cocktailId,
      text,
    ]) ?? [],
  );
  const source: RecommendationResults["source"] = !session.menuImage
    ? "all"
    : menuTextById.size > 0
      ? "menu"
      : "fallback";

  // 気分の入力がないときは、相性を計算できないので、メニューに載っていた順に並べる。
  // （おすすめ API は入力文を店舗向けの集計に記録するので、代わりの文を入れて呼ばない）
  if (session.query === "") {
    const matched = session.menuMatch?.matched ?? [];
    const responses = await Promise.all(
      matched.map(({ cocktailId }) => getCocktail(cocktailId)),
    );
    return {
      sessionId: session.id,
      recommendations: responses.flatMap((response, i) =>
        response.status === 200
          ? [
              {
                cocktail: response.data,
                score: null,
                menuText: matched[i].text,
                x: null,
                y: null,
              },
            ]
          : [],
      ),
      unregistered: session.menuMatch?.unregistered ?? [],
      source,
      positionsLocated: source !== "menu",
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
        x: null,
        y: null,
      }),
    ),
    unregistered: session.menuMatch?.unregistered ?? [],
    source,
    positionsLocated: source !== "menu",
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
    typeof value.source === "string" &&
    "positionsLocated" in value &&
    typeof value.positionsLocated === "boolean"
  );
}

function saveResults(results: RecommendationResults): void {
  sessionStorage.setItem(RESULTS_KEY, JSON.stringify(results));
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
  saveResults(results);
  return results;
}

// 検索ごとに、位置を求める処理を1回にまとめる（一覧と詳細から同時に呼ばれても1回だけ）
const locating = new Map<string, Promise<RecommendationResults>>();

// おすすめに選ばれたメニュー内のお酒（5件まで）だけ、メニューの写真上の位置を求めて保存する。
// 位置を求められなくても、おすすめはそのまま使えるので、失敗したら位置なしで返す
export function locateRecommendations(
  session: RecommendationSession,
  results: RecommendationResults,
): Promise<RecommendationResults> {
  if (results.positionsLocated || !session.menuImage) {
    return Promise.resolve(results);
  }
  const inFlight = locating.get(session.id);
  if (inFlight) return inFlight;

  // 位置を求める API は一度に10件までなので、上から10件だけ求める
  const texts = results.recommendations
    .flatMap(({ menuText }) => (menuText ? [menuText] : []))
    .slice(0, LOCATE_LIMIT);
  // 写真は、検索時に保存した縮小版（data URL）をそのまま送る
  const promise = locateOnMenu(session.menuImage, texts)
    .then((positions) => {
      const located: RecommendationResults = {
        ...results,
        recommendations: results.recommendations.map((entry) => {
          const position = entry.menuText
            ? positions.get(entry.menuText)
            : undefined;
          return { ...entry, x: position?.x ?? null, y: position?.y ?? null };
        }),
        positionsLocated: true,
      };
      saveResults(located);
      return located;
    })
    .catch(() => results)
    .finally(() => locating.delete(session.id));
  locating.set(session.id, promise);
  return promise;
}
