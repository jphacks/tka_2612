import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { cocktails, rankCocktails } from "~/data/cocktails";
import { loadFavorites, saveFavorites } from "~/lib/favorites";
import {
  loadRecommendationSession,
  type RecommendationSession,
} from "~/lib/recommendation-session";
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
  const { cocktailId } = useParams();
  const cocktail = cocktails.find((item) => item.id === cocktailId);
  const [session, setSession] = useState<RecommendationSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteError, setFavoriteError] = useState("");
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    try {
      setSession(loadRecommendationSession());
    } catch {
      setSessionError("検索情報を読み取れませんでした。");
    }

    try {
      setFavorites(loadFavorites());
    } catch {
      setFavoriteError(
        "お気に入りを読み込めませんでした。ブラウザーの保存データを確認してください。",
      );
    } finally {
      setIsLoaded(true);
    }
  }, []);

  if (!cocktail) {
    return (
      <main className="site-shell detail-shell">
        <header className="topbar">
          <Link className="brand" to="/" aria-label="SIP ホーム">
            <span className="brand-mark" aria-hidden="true">
              S
            </span>
            <span>
              SIP<span className="brand-period">.</span>
            </span>
          </Link>
          <Link className="topbar-link" to="/cocktails">
            一覧に戻る <span aria-hidden="true">↗</span>
          </Link>
        </header>
        <section className="detail-page page-message" role="alert">
          <h1>お酒が見つかりませんでした</h1>
          <Link className="text-link" to="/cocktails">
            おすすめ一覧に戻る
          </Link>
        </section>
      </main>
    );
  }

  const recommendation = rankCocktails(session?.query ?? "").find(
    (item) => item.cocktail.id === cocktail.id,
  );
  const selectedCocktailId = cocktail.id;
  const isFavorite = favorites.includes(selectedCocktailId);

  function toggleFavorite() {
    const updatedFavorites = isFavorite
      ? favorites.filter((id) => id !== selectedCocktailId)
      : [...favorites, selectedCocktailId];

    try {
      saveFavorites(updatedFavorites);
      setFavorites(updatedFavorites);
      setFavoriteError("");
    } catch {
      setFavoriteError(
        "お気に入りを保存できませんでした。ブラウザーの保存領域をご確認ください。",
      );
    }
  }

  return (
    <main className="site-shell detail-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="SIP ホーム">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>
            SIP<span className="brand-period">.</span>
          </span>
        </Link>
        <span className="topbar-note">あなたに合う一杯を見つけよう</span>
        <Link className="topbar-link" to="/cocktails">
          一覧に戻る <span aria-hidden="true">↗</span>
        </Link>
      </header>

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
                  alt={`メニュー写真。${cocktail.name}をマークしています。`}
                />
                <span
                  className="menu-selection-marker"
                  style={{
                    left: `${cocktail.menuPosition.x}%`,
                    top: `${cocktail.menuPosition.y}%`,
                  }}
                >
                  <span className="marker-pulse" aria-hidden="true" />
                  <span className="marker-label">{cocktail.name}</span>
                </span>
              </div>
              <figcaption>
                {session.menuImageName ?? "アップロードしたメニュー写真"}
                <span> マーク位置は画面確認用のサンプルです</span>
              </figcaption>
            </figure>
          ) : (
            <div className="detail-menu-empty">
              <div
                className={`cocktail-art cocktail-art-${cocktail.color}`}
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
              <p className="cocktail-english">{cocktail.englishName}</p>
              <h2 id="cocktail-name">{cocktail.name}</h2>
              <div className="cocktail-tags">
                {cocktail.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="detail-match">
              <strong>
                {recommendation?.score ?? 0}
                <small>%</small>
              </strong>
              <span>あなたとの相性</span>
            </div>
          </div>

          <div className="detail-description-block">
            <div className="detail-description">
              <p className="eyebrow section-eyebrow">A LITTLE STORY</p>
              <h3>この一杯について</h3>
              <p>{cocktail.detail}</p>
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
                <p>お気に入りはこのブラウザーに保存されます。</p>
              </div>
            </div>
            <button
              className={`favorite-button${isFavorite ? " is-favorite" : ""}`}
              type="button"
              aria-pressed={isFavorite}
              disabled={!isLoaded || Boolean(favoriteError)}
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

      <footer className="footer">
        <Link className="brand footer-brand" to="/" aria-label="SIP ホーム">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>
            SIP<span className="brand-period">.</span>
          </span>
        </Link>
        <span>Find a drink that feels like you.</span>
        <span className="footer-year">JPHACKS 2026</span>
      </footer>
    </main>
  );
}
