import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router";
import { type Cocktail, getCocktail } from "~/api/generated";
import { NeonGlass } from "~/components/neon-glass";
import {
  BackLink,
  Page,
  SiteHeader,
  SiteShell,
} from "~/components/site-chrome";
import {
  EnglishName,
  ErrorText,
  Message,
  PageTitle,
  Score,
  Tags,
  TextLink,
} from "~/components/ui";
import { baseTags, drinkColor, englishName } from "~/lib/cocktail-display";
import {
  loadFavoriteCount,
  loadFavoriteIds,
  setFavorite,
} from "~/lib/favorites";
import {
  loadRecommendationSession,
  type RecommendationSession,
} from "~/lib/recommendation-session";
import {
  loadRecommendationResults,
  locateRecommendations,
  type RecommendationEntry,
  type RecommendationResults,
} from "~/lib/recommendations";
import type { Route } from "./+types/cocktail-detail";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "一杯 — カクテルタスケル" },
    {
      name: "description",
      content: "気になる一杯の味わいや材料を詳しく紹介します。",
    },
  ];
}

// 地図（/cocktail_points）やお気に入り（/favorites）から来たときに、Link の state で渡される情報
type FromPage = {
  // 戻り先（地図なら検索の ?q= を含む URL）
  backTo: string;
  // 戻るリンクに出す名前。省略すると「地図」
  backLabel: string;
  // 地図で検索した入力文との相性。検索していなければ null
  score: number | null;
};

function readFromPage(state: unknown): FromPage | null {
  if (
    typeof state === "object" &&
    state !== null &&
    "backTo" in state &&
    typeof state.backTo === "string" &&
    "score" in state &&
    (typeof state.score === "number" || state.score === null)
  ) {
    const backLabel =
      "backLabel" in state && typeof state.backLabel === "string"
        ? state.backLabel
        : "地図";
    return { backTo: state.backTo, backLabel, score: state.score };
  }
  return null;
}

export default function CocktailDetail() {
  const { cocktailId = "" } = useParams();
  const fromPage = readFromPage(useLocation().state);
  const isFromPage = fromPage !== null;
  // 「戻る」の行き先。地図やお気に入りから来たらそこへ、それ以外はおすすめ一覧へ
  const back = fromPage
    ? { to: fromPage.backTo, label: fromPage.backLabel }
    : { to: "/cocktails", label: "おすすめ一覧" };
  const [cocktail, setCocktail] = useState<Cocktail | null>(null);
  const [loadState, setLoadState] = useState<
    "loading" | "ready" | "not-found" | "error"
  >("loading");
  const [session, setSession] = useState<RecommendationSession | null>(null);
  const [entry, setEntry] = useState<RecommendationEntry | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState<number | null>(null);
  const [isFavoriteReady, setIsFavoriteReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [favoriteError, setFavoriteError] = useState("");
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    // 一覧で計算したおすすめの結果（相性とメニュー上の位置）を使う。
    // 地図やお気に入りから来たときは、前の写真の検索の結果を出さないよう読まない
    if (!isFromPage) {
      try {
        const currentSession = loadRecommendationSession();
        setSession(currentSession);
        const results = currentSession
          ? loadRecommendationResults(currentSession.id)
          : null;
        const findEntry = (r: RecommendationResults) =>
          r.recommendations.find((item) => item.cocktail.id === cocktailId) ??
          null;
        setEntry(results ? findEntry(results) : null);
        // 一覧で位置を求め終わる前に開いたときは、ここで位置を待つ（問い合わせは1回にまとまる）
        if (currentSession && results && !results.positionsLocated) {
          locateRecommendations(currentSession, results).then((located) =>
            setEntry(findEntry(located)),
          );
        }
      } catch {
        setSessionError("検索情報を読み取れませんでした。");
      }
    }

    getCocktail(cocktailId)
      .then((response) => {
        if (response.status === 200) {
          setCocktail(response.data);
          setLoadState("ready");
        } else {
          setLoadState(response.status === 404 ? "not-found" : "error");
        }
      })
      .catch(() => setLoadState("error"));

    Promise.all([loadFavoriteIds(), loadFavoriteCount(cocktailId)])
      .then(([ids, count]) => {
        setIsFavorite(ids.includes(cocktailId));
        setFavoriteCount(count);
        setIsFavoriteReady(true);
      })
      .catch(() => {
        setFavoriteError("お気に入りを読み込めませんでした。");
      });
  }, [cocktailId, isFromPage]);

  const header = (
    <SiteHeader>
      <BackLink to={back.to} label={back.label} />
    </SiteHeader>
  );

  if (loadState === "loading") {
    return (
      <SiteShell>
        {header}
        <Page>
          <Message>…</Message>
        </Page>
      </SiteShell>
    );
  }

  if (loadState !== "ready" || !cocktail) {
    return (
      <SiteShell>
        {header}
        <Page>
          <Message role="alert">
            <p>
              {loadState === "not-found"
                ? "お酒が見つかりませんでした"
                : "読み込めませんでした"}
            </p>
            <TextLink to={back.to}>{back.label}へ</TextLink>
          </Message>
        </Page>
      </SiteShell>
    );
  }

  // メニュー写真上の位置（おすすめが決まったあとに求めた位置があるときだけ印を付ける）
  const markerPosition =
    entry?.x != null && entry.y != null ? { x: entry.x, y: entry.y } : null;
  const selectedCocktailId = cocktail.id;
  // おすすめ一覧の結果があればその相性、地図から来たら地図で検索したときの相性
  const score = entry?.score ?? fromPage?.score ?? null;

  async function toggleFavorite() {
    setIsSaving(true);
    try {
      const { favorited, count } = await setFavorite(
        selectedCocktailId,
        !isFavorite,
      );
      setIsFavorite(favorited);
      setFavoriteCount(count);
      setFavoriteError("");
    } catch {
      setFavoriteError("お気に入りを保存できませんでした");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SiteShell>
      {header}

      <Page aria-labelledby="cocktail-name">
        <div className="flex items-center gap-5 max-md:flex-wrap max-md:gap-4">
          <NeonGlass
            color={drinkColor(cocktail)}
            className="h-26 w-22 shrink-0 max-md:h-19 max-md:w-16"
          />
          <div className="min-w-0 flex-1">
            <EnglishName>{englishName(cocktail)}</EnglishName>
            <PageTitle id="cocktail-name">{cocktail.name}</PageTitle>
            <Tags className="mt-3" items={baseTags(cocktail)} />
          </div>
          {score !== null && <Score value={score} size="lg" />}
        </div>

        <p className="mt-7 text-base text-muted leading-loose">
          {cocktail.description}
        </p>

        <Tags className="mt-5" items={cocktail.ingredients} label="材料" />

        <button
          className="mt-7 inline-flex h-12 min-w-18 items-center justify-center gap-2 rounded-full border border-line px-5 text-base text-muted transition-colors hover:border-neon/55 hover:text-neon disabled:cursor-wait disabled:opacity-60 aria-pressed:border-neon/55 aria-pressed:text-neon"
          type="button"
          aria-pressed={isFavorite}
          aria-label={isFavorite ? "お気に入りから外す" : "お気に入りに追加"}
          disabled={!isFavoriteReady || isSaving}
          onClick={toggleFavorite}
        >
          <span className="text-xl" aria-hidden="true">
            {isFavorite ? "♥" : "♡"}
          </span>
          {favoriteCount ?? ""}
        </button>
        {favoriteError && (
          <ErrorText className="mt-2.5" role="alert">
            {favoriteError}
          </ErrorText>
        )}

        {/* 印の位置は写真に対する % なので、写真は切り抜かず枠ごと小さくする */}
        {session?.menuImage && (
          <figure className="relative mt-9 max-w-105 overflow-hidden rounded-2xl border border-line">
            {/* 白いメニュー写真が夜の画面で浮かないよう、少し暗くする */}
            <img
              className="block h-auto w-full brightness-80"
              src={session.menuImage}
              alt={
                markerPosition
                  ? `メニュー写真。${cocktail.name}の位置に印を付けています`
                  : "読み取ったメニューの写真"
              }
            />
            {/* このお酒が書かれていた場所を光らせる */}
            {markerPosition && (
              <span
                className="absolute size-5.5 -translate-1/2 rounded-full border-3 border-white bg-neon shadow-halo"
                style={{
                  left: `${markerPosition.x}%`,
                  top: `${markerPosition.y}%`,
                }}
                aria-hidden="true"
              >
                <span className="absolute -inset-2 animate-ping rounded-full border-2 border-neon" />
              </span>
            )}
          </figure>
        )}
        {sessionError && (
          <ErrorText className="mt-2.5">{sessionError}</ErrorText>
        )}
      </Page>
    </SiteShell>
  );
}
