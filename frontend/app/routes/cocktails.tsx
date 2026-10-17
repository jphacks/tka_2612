import { useEffect, useState } from "react";
import { Link } from "react-router";
import { rankCocktails } from "~/data/cocktails";
import {
  loadRecommendationSession,
  type RecommendationSession,
} from "~/lib/recommendation-session";
import type { Route } from "./+types/cocktails";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "おすすめのお酒 — SIP" },
    {
      name: "description",
      content: "今の気分に合うお酒をランキングで紹介します。",
    },
  ];
}

export default function Cocktails() {
  const [session, setSession] = useState<RecommendationSession | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      setSession(loadRecommendationSession());
    } catch {
      setLoadError(
        "検索情報を読み取れませんでした。ホームからもう一度検索してください。",
      );
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const recommendations = rankCocktails(session?.query ?? "");

  return (
    <main className="site-shell">
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
        <Link className="topbar-link" to="/">
          ホームへ戻る <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <section
        className="results-section list-page"
        aria-labelledby="results-title"
      >
        <p className="eyebrow section-eyebrow">MADE FOR YOUR MOOD</p>
        <div className="results-heading">
          <div>
            <h1 id="results-title">今夜のおすすめ</h1>
            {session && (
              <p className="results-description">
                「{session.query}」に合うお酒を、相性の高い順にご紹介します。
              </p>
            )}
          </div>
          <span className="step-label">
            <span>02</span> / 03
          </span>
        </div>

        {!isLoaded && <p className="page-message">おすすめを準備しています…</p>}
        {loadError && (
          <div className="page-message page-error" role="alert">
            <p>{loadError}</p>
            <Link className="text-link" to="/">
              ホームに戻る
            </Link>
          </div>
        )}
        {isLoaded && !loadError && !session && (
          <div className="page-message">
            <p>検索条件がありません。気分を入力しておすすめを探しましょう。</p>
            <Link className="text-link" to="/">
              ホームで探す <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
        {session && (
          <>
            <div className="catalog-note">
              <span className="catalog-note-icon" aria-hidden="true">
                ✳
              </span>
              <p>
                {session.menuImage
                  ? "メニュー画像を受け取りました。現在OCRは未接続のため、全カタログからおすすめを表示しています。"
                  : "メニュー画像がないため、全カタログからおすすめを表示しています。"}
                <span>画面確認用のサンプルデータです。</span>
              </p>
            </div>
            {session.menuImage && (
              <figure className="list-menu-preview">
                <img
                  src={session.menuImage}
                  alt={`アップロードしたメニュー: ${session.menuImageName ?? "メニュー写真"}`}
                />
                <figcaption>
                  {session.menuImageName ?? "メニュー写真"}
                </figcaption>
              </figure>
            )}
            <div className="cocktail-list">
              {recommendations.map(({ cocktail, score }, index) => (
                <Link
                  className="cocktail-card cocktail-card-link"
                  key={cocktail.id}
                  to={`/cocktails/${cocktail.id}`}
                >
                  <div
                    className={`cocktail-art cocktail-art-${cocktail.color}`}
                    aria-hidden="true"
                  >
                    <span className="cocktail-number">0{index + 1}</span>
                    <span className="mini-glass">
                      <span className="mini-drink" />
                    </span>
                  </div>
                  <div className="cocktail-info">
                    <p className="cocktail-english">{cocktail.englishName}</p>
                    <h2>{cocktail.name}</h2>
                    <p className="cocktail-description">
                      {cocktail.description}
                    </p>
                    <div className="cocktail-tags">
                      {cocktail.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="match-score">
                    <strong>
                      {score}
                      <small>%</small>
                    </strong>
                    <span>相性</span>
                  </div>
                  <span className="card-open" aria-hidden="true">
                    ↗
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

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
