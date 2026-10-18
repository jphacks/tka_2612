import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
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
  type RecommendationEntry,
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
        const found = currentSession
          ? loadRecommendationResults(currentSession.id)?.recommendations.find(
              (item) => item.cocktail.id === cocktailId,
            )
          : undefined;
        setEntry(found ?? null);
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

  if (loadState === "loading") {
    return (
      <main className="site-shell detail-shell">
        <SiteHeader showNote={false}>
          <Link className="topbar-link" to={back.to}>
            {back.label}に戻る <span aria-hidden="true">↗</span>
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
          <Link className="topbar-link" to={back.to}>
            {back.label}に戻る <span aria-hidden="true">↗</span>
          </Link>
        </SiteHeader>
        <section className="detail-page page-message" role="alert">
          <h1>
            {loadState === "not-found"
              ? "お酒が見つかりませんでした"
              : "お酒の情報を読み込めませんでした"}
          </h1>
          <Link className="text-link" to={back.to}>
            {back.label}に戻る
          </Link>
        </section>
      </main>
    );
  }

  // メニュー写真上の位置（このお酒が書かれていた行を読み取れたときだけ印を付ける）
  const menuItem = entry?.menuText
    ? session?.recognizedMenuItems?.find(({ text }) => text === entry.menuText)
    : undefined;
  const markerPosition =
    menuItem?.x != null && menuItem.y != null
      ? { x: menuItem.x, y: menuItem.y }
      : null;
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
      setFavoriteError("お気に入りを保存できませんでした。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="site-shell detail-shell">
      <SiteHeader>
        <Link className="topbar-link" to={back.to}>
          {back.label}に戻る <span aria-hidden="true">↗</span>
        </Link>
      </SiteHeader>

      <article className="detail-page">
        <div className="detail-breadcrumb">
          <Link to={back.to}>{back.label}</Link>
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
                {score !== null ? Math.round(score * 100) : "—"}
                {score !== null && <small>%</small>}
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
            <Link className="text-link" to={back.to}>
              ← {back.label}に戻る
            </Link>
            {session?.query && <span>「{session.query}」からのおすすめ</span>}
          </div>
        </section>
      </article>

      <SiteFooter />
    </main>
  );
}
