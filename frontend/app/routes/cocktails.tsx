import { useEffect, useState } from "react";
import { Link } from "react-router";
import { NeonGlass } from "~/components/neon-glass";
import { SiteHeader } from "~/components/site-chrome";
import { drinkColor, englishName } from "~/lib/cocktail-display";
import {
  loadRecommendationSession,
  type RecommendationSession,
} from "~/lib/recommendation-session";
import {
  getRecommendationResults,
  type RecommendationResults,
} from "~/lib/recommendations";
import type { Route } from "./+types/cocktails";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "おすすめ — カクテルタスケル" },
    {
      name: "description",
      content: "今の気分に合うお酒をランキングで紹介します。",
    },
  ];
}

export default function Cocktails() {
  const [session, setSession] = useState<RecommendationSession | null>(null);
  const [loadError, setLoadError] = useState("");
  const [result, setResult] = useState<RecommendationResults | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let currentSession: RecommendationSession | null;
    try {
      currentSession = loadRecommendationSession();
    } catch {
      setLoadError(
        "検索情報を読み取れませんでした。ホームからもう一度検索してください。",
      );
      setIsLoaded(true);
      return;
    }
    setSession(currentSession);
    if (!currentSession) {
      setIsLoaded(true);
      return;
    }

    getRecommendationResults(currentSession)
      .then(setResult)
      .catch((error: unknown) => {
        setLoadError(
          error instanceof Error
            ? error.message
            : "おすすめを取得できませんでした。",
        );
      })
      .finally(() => setIsLoaded(true));
  }, []);

  // どこから選んだかを、短く添える
  const sourceLabel =
    result?.source === "menu"
      ? "メニューから"
      : result?.source === "fallback"
        ? "メニューのお酒が見つからず、全体から"
        : "全体から";

  return (
    <main className="site-shell">
      <SiteHeader>
        <Link className="topbar-link" to="/">
          ← ホーム
        </Link>
      </SiteHeader>

      <section className="page" aria-labelledby="results-title">
        {!isLoaded && <p className="page-message">…</p>}
        {loadError && (
          <div className="page-message" role="alert">
            <p>{loadError}</p>
            <Link className="text-link" to="/">
              ホームへ
            </Link>
          </div>
        )}
        {isLoaded && !loadError && !session && (
          <div className="page-message">
            <p>まだ何も探していません</p>
            <Link className="text-link" to="/">
              ホームで探す →
            </Link>
          </div>
        )}
        {session && result && (
          <>
            <h1 className="page-title" id="results-title">
              「{session.query}」
            </h1>
            <p className="page-sub">
              {session.menuImage && (
                <img
                  className="menu-thumb"
                  src={session.menuImage}
                  alt="読み取ったメニューの写真"
                />
              )}
              {sourceLabel}・{result.recommendations.length}杯
            </p>
            {session.ocrError && (
              <p className="page-error">{session.ocrError}</p>
            )}

            <ol className="drink-list">
              {result.recommendations.map(({ cocktail, score }) => (
                <li key={cocktail.id}>
                  <Link className="drink-card" to={`/cocktails/${cocktail.id}`}>
                    <NeonGlass color={drinkColor(cocktail)} />
                    <div className="drink-body">
                      <h2>{cocktail.name}</h2>
                      <p className="drink-en">{englishName(cocktail)}</p>
                      <p className="drink-desc">{cocktail.description}</p>
                    </div>
                    <p className="score">
                      {Math.round(score * 100)}
                      <small>%</small>
                    </p>
                  </Link>
                </li>
              ))}
            </ol>

            {result.unregistered.length > 0 && (
              <p className="page-note">
                未登録: {result.unregistered.join("、")}
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
