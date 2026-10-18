import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { type Cocktail, getCocktail } from "~/api/generated";
import { SiteFooter, SiteHeader } from "~/components/site-chrome";
import { baseTags, cardColor, englishName } from "~/lib/cocktail-display";
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
    { title: "お酒の詳細 — SIP" },
    {
      name: "description",
      content: "気になる一杯の味わいや材料を詳しく紹介します。",
    },
  ];
}

export default function CocktailDetail() {
  const { cocktailId = "" } = useParams();
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
    // 一覧で計算したおすすめの結果（相性とメニュー上の位置）を使う
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
  }, [cocktailId]);

  if (loadState === "loading") {
    return (
      <main className="site-shell detail-shell">
        <SiteHeader showNote={false}>
          <Link className="topbar-link" to="/cocktails">
            一覧に戻る <span aria-hidden="true">↗</span>
          </Link>
        </SiteHeader>
        <p className="detail-page page-message">読み込んでいます…</p>
      </main>
    );
  }

  if (loadState !== "ready" || !cocktail) {
    return (
      <main className="site-shell detail-shell">
        <SiteHeader showNote={false}>
          <Link className="topbar-link" to="/cocktails">
            一覧に戻る <span aria-hidden="true">↗</span>
          </Link>
        </SiteHeader>
        <section className="detail-page page-message" role="alert">
          <h1>
            {loadState === "not-found"
              ? "お酒が見つかりませんでした"
              : "お酒の情報を読み込めませんでした"}
          </h1>
          <Link className="text-link" to="/cocktails">
            おすすめ一覧に戻る
          </Link>
        </section>
      </main>
    );
  }

  // メニュー写真上の位置（おすすめが決まったあとに求めた位置があるときだけ印を付ける）
  const markerPosition =
    entry?.x != null && entry.y != null ? { x: entry.x, y: entry.y } : null;
  const selectedCocktailId = cocktail.id;

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
      setFavoriteError("お気に入りを保存できませんでした。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="site-shell detail-shell">
      <SiteHeader>
        <Link className="topbar-link" to="/cocktails">
          一覧に戻る <span aria-hidden="true">↗</span>
        </Link>
      </SiteHeader>

      <article className="detail-page">
        <div className="detail-breadcrumb">
          <Link to="/cocktails">おすすめ一覧</Link>
          <span aria-hidden="true">/</span>
          <span>{cocktail.name}</span>
          <span className="step-label">
            <span>03</span> / 03
          </span>
        </div>

        <section className="detail-menu-section" aria-labelledby="menu-title">
          <div className="detail-section-heading">
            <p className="eyebrow section-eyebrow">ON THE MENU</p>
            <h1 id="menu-title">メニューで見つけた一杯</h1>
          </div>
          {session?.menuImage ? (
            <figure className="detail-menu-figure">
              <div className="detail-menu-photo">
                <img
                  src={session.menuImage}
                  alt={
                    markerPosition
                      ? `メニュー写真。${cocktail.name}の位置をマークしています。`
                      : "アップロードしたメニュー写真"
                  }
                />
                {markerPosition && (
                  <span
                    className="menu-selection-marker"
                    style={{
                      left: `${markerPosition.x}%`,
                      top: `${markerPosition.y}%`,
                    }}
                  >
                    <span className="marker-pulse" aria-hidden="true" />
                    <span className="marker-label">{cocktail.name}</span>
                  </span>
                )}
              </div>
              <figcaption>
                {session.menuImageName ?? "アップロードしたメニュー写真"}
                <span>
                  {markerPosition
                    ? " AI で読み取った掲載位置をマークしています"
                    : " この一杯の掲載位置を特定できませんでした"}
                </span>
              </figcaption>
            </figure>
          ) : (
            <div className="detail-menu-empty">
              <div
                className={`cocktail-art cocktail-art-${cardColor(cocktail)}`}
                aria-hidden="true"
              >
                <span className="mini-glass">
                  <span className="mini-drink" />
                </span>
              </div>
              <div>
                <strong>メニュー写真はありません</strong>
                <p>今回はお酒のカタログからおすすめしています。</p>
              </div>
            </div>
          )}
          {sessionError && (
            <p className="detail-storage-error" role="status">
              {sessionError}
            </p>
          )}
        </section>

        <section className="detail-copy" aria-labelledby="cocktail-name">
          <div className="detail-copy-heading">
            <div>
              <p className="cocktail-english">{englishName(cocktail)}</p>
              <h2 id="cocktail-name">{cocktail.name}</h2>
              <div className="cocktail-tags">
                {baseTags(cocktail).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="detail-match">
              <strong>
                {entry ? Math.round(entry.score * 100) : "—"}
                {entry && <small>%</small>}
              </strong>
              <span>あなたとの相性</span>
            </div>
          </div>

          <div className="detail-description-block">
            <div className="detail-description">
              <p className="eyebrow section-eyebrow">A LITTLE STORY</p>
              <h3>この一杯について</h3>
              <p>{cocktail.description}</p>
            </div>
            <aside className="detail-ingredients">
              <p className="eyebrow section-eyebrow">WHAT’S INSIDE</p>
              <h3>主な材料</h3>
              <ul>
                {cocktail.ingredients.map((ingredient) => (
                  <li key={ingredient}>{ingredient}</li>
                ))}
              </ul>
            </aside>
          </div>

          <div className="favorite-panel">
            <div className="favorite-copy">
              <span className="favorite-star" aria-hidden="true">
                {isFavorite ? "★" : "☆"}
              </span>
              <div>
                <strong>
                  {isFavorite
                    ? "お気に入りに登録しました"
                    : "この一杯をお気に入りに"}
                </strong>
                <p>
                  {favoriteCount === null
                    ? "お気に入りの数を読み込んでいます…"
                    : `${favoriteCount}人がお気に入りに登録しています`}
                </p>
              </div>
            </div>
            <button
              className={`favorite-button${isFavorite ? " is-favorite" : ""}`}
              type="button"
              aria-pressed={isFavorite}
              disabled={!isFavoriteReady || isSaving}
              onClick={toggleFavorite}
            >
              <span aria-hidden="true">{isFavorite ? "★" : "☆"}</span>
              {isFavorite ? "登録済み" : "お気に入り"}
            </button>
          </div>
          {favoriteError && (
            <p className="detail-storage-error" role="alert">
              {favoriteError}
            </p>
          )}

          <div className="detail-bottom-nav">
            <Link className="text-link" to="/cocktails">
              ← おすすめ一覧に戻る
            </Link>
            {session?.query && <span>「{session.query}」からのおすすめ</span>}
          </div>
        </section>
      </article>

      <SiteFooter />
    </main>
  );
}
