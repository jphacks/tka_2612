import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { type Cocktail, getCocktail } from "~/api/generated";
import { NeonGlass } from "~/components/neon-glass";
import { SiteHeader } from "~/components/site-chrome";
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

// 地図（/cocktail_points）の詳細カードから来たときに、Link の state で渡される情報
type FromMap = {
  // 戻り先（地図の URL。検索の ?q= を含む）
  backTo: string;
  // 地図で検索した入力文との相性。検索していなければ null
  score: number | null;
};

function readFromMap(state: unknown): FromMap | null {
  if (
    typeof state === "object" &&
    state !== null &&
    "backTo" in state &&
    typeof state.backTo === "string" &&
    "score" in state &&
    (typeof state.score === "number" || state.score === null)
  ) {
    return { backTo: state.backTo, score: state.score };
  }
  return null;
}

export default function CocktailDetail() {
  const { cocktailId = "" } = useParams();
  const fromMap = readFromMap(useLocation().state);
  const isFromMap = fromMap !== null;
  // 「戻る」の行き先。地図から来たら地図へ、それ以外はおすすめ一覧へ
  const back = fromMap
    ? { to: fromMap.backTo, label: "地図" }
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
    // 地図から来たときは、前の写真の検索の結果を出さないよう読まない
    if (!isFromMap) {
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
  }, [cocktailId, isFromMap]);

  const backLink = (
    <Link className="topbar-link" to={back.to}>
      ← {back.label}
    </Link>
  );

  if (loadState === "loading") {
    return (
      <main className="site-shell">
        <SiteHeader>{backLink}</SiteHeader>
        <p className="page page-message">…</p>
      </main>
    );
  }

  if (loadState !== "ready" || !cocktail) {
    return (
      <main className="site-shell">
        <SiteHeader>{backLink}</SiteHeader>
        <section className="page page-message" role="alert">
          <p>
            {loadState === "not-found"
              ? "お酒が見つかりませんでした"
              : "読み込めませんでした"}
          </p>
          <Link className="text-link" to={back.to}>
            {back.label}へ
          </Link>
        </section>
      </main>
    );
  }

  // メニュー写真上の位置（おすすめが決まったあとに求めた位置があるときだけ印を付ける）
  const markerPosition =
    entry?.x != null && entry.y != null ? { x: entry.x, y: entry.y } : null;
  const selectedCocktailId = cocktail.id;
  // おすすめ一覧の結果があればその相性、地図から来たら地図で検索したときの相性
  const score = entry?.score ?? fromMap?.score ?? null;

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
    <main className="site-shell">
      <SiteHeader>{backLink}</SiteHeader>

      <article className="page detail" aria-labelledby="cocktail-name">
        <div className="detail-head">
          <NeonGlass color={drinkColor(cocktail)} className="detail-glass" />
          <div className="detail-title">
            <p className="drink-en">{englishName(cocktail)}</p>
            <h1 className="page-title" id="cocktail-name">
              {cocktail.name}
            </h1>
            <div className="tags">
              {baseTags(cocktail).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
          {score !== null && (
            <p className="score score-lg" title="相性">
              {Math.round(score * 100)}
              <small>%</small>
            </p>
          )}
        </div>

        <p className="detail-text">{cocktail.description}</p>

        <ul className="tags tags-ingredients" aria-label="材料">
          {cocktail.ingredients.map((ingredient) => (
            <li key={ingredient}>{ingredient}</li>
          ))}
        </ul>

        <button
          className={`fav-button${isFavorite ? " is-favorite" : ""}`}
          type="button"
          aria-pressed={isFavorite}
          aria-label={isFavorite ? "お気に入りから外す" : "お気に入りに追加"}
          disabled={!isFavoriteReady || isSaving}
          onClick={toggleFavorite}
        >
          <span aria-hidden="true">{isFavorite ? "♥" : "♡"}</span>
          {favoriteCount ?? ""}
        </button>
        {favoriteError && (
          <p className="page-error" role="alert">
            {favoriteError}
          </p>
        )}

        {session?.menuImage && (
          <figure className="detail-menu">
            <img
              src={session.menuImage}
              alt={
                markerPosition
                  ? `メニュー写真。${cocktail.name}の位置に印を付けています`
                  : "読み取ったメニューの写真"
              }
            />
            {markerPosition && (
              <span
                className="menu-marker"
                style={{
                  left: `${markerPosition.x}%`,
                  top: `${markerPosition.y}%`,
                }}
                aria-hidden="true"
              />
            )}
          </figure>
        )}
        {sessionError && <p className="page-error">{sessionError}</p>}
      </article>
    </main>
  );
}
