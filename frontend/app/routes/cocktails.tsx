import { useEffect, useState } from "react";
import { DrinkCard, DrinkList } from "~/components/drink-card";
import {
  BackLink,
  Page,
  SiteHeader,
  SiteShell,
} from "~/components/site-chrome";
import {
  ErrorText,
  Message,
  PageSub,
  PageTitle,
  Score,
  TextLink,
} from "~/components/ui";
import {
  loadRecommendationSession,
  type RecommendationSession,
} from "~/lib/recommendation-session";
import {
  getRecommendationResults,
  locateRecommendations,
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
      .then((results) => {
        setResult(results);
        // 一覧はすぐ表示し、詳細ページの印に使う位置は後から求めておく
        locateRecommendations(currentSession, results);
      })
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
    <SiteShell>
      <SiteHeader>
        <BackLink to="/" label="ホーム" />
      </SiteHeader>

      <Page aria-labelledby="results-title">
        {!isLoaded && <Message>…</Message>}
        {loadError && (
          <Message role="alert">
            <p>{loadError}</p>
            <TextLink to="/">ホームへ</TextLink>
          </Message>
        )}
        {isLoaded && !loadError && !session && (
          <Message>
            <p>まだ何も探していません</p>
            <TextLink to="/">ホームで探す →</TextLink>
          </Message>
        )}
        {session && result && (
          <>
            <PageTitle id="results-title">
              {session.query ? `「${session.query}」` : "メニューのお酒"}
            </PageTitle>
            <PageSub>
              {session.menuImage && (
                <img
                  className="size-9 shrink-0 rounded-lg border border-line object-cover"
                  src={session.menuImage}
                  alt="読み取ったメニューの写真"
                />
              )}
              {sourceLabel}・{result.recommendations.length}杯
            </PageSub>
            {session.ocrError && (
              <ErrorText className="mt-2.5">{session.ocrError}</ErrorText>
            )}

            {result.recommendations.length === 0 && (
              <Message>
                <p>メニューからお酒を見つけられませんでした</p>
                <TextLink to="/cocktail_points">地図で探す →</TextLink>
              </Message>
            )}

            <DrinkList>
              {result.recommendations.map(({ cocktail, score }) => (
                <DrinkCard
                  key={cocktail.id}
                  cocktail={cocktail}
                  aside={score !== null && <Score value={score} />}
                />
              ))}
            </DrinkList>

            {result.unregistered.length > 0 && (
              <p className="mt-6 text-faint text-sm">
                未登録: {result.unregistered.join("、")}
              </p>
            )}
          </>
        )}
      </Page>
    </SiteShell>
  );
}
