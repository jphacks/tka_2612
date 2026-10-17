import { useEffect, useState } from "react";
import { Link } from "react-router";
import { SiteFooter, SiteHeader } from "~/components/site-chrome";
import { recommendCocktails } from "~/data/cocktails";
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

  const result = recommendCocktails(
    session?.query ?? "",
    session?.recognizedMenuItems ?? null,
  );

  return (
    <main className="site-shell">
      <SiteHeader>
        <Link className="topbar-link" to="/">
          ホームへ戻る <span aria-hidden="true">↗</span>
        </Link>
      </SiteHeader>

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
                  ? result.source === "menu"
                    ? "写真から認識したメニュー掲載酒を、気分に合う順に表示しています。"
                    : "メニュー内のカクテルを特定できなかったため、全カタログから表示しています。"
                  : "メニュー画像がないため、全カタログからおすすめを表示しています。"}
                <span>
                  {session.menuImage
                    ? session.ocrError
                      ? `OCRに失敗しました: ${session.ocrError}`
                      : "画像のメニューを AI（Gemini）で読み取りました。"
                    : "写真を追加すると、画像内のメニューを読み取って候補を絞り込みます。"}
                </span>
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
              {result.recommendations.map(({ cocktail, score }, index) => (
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
                      {Math.round(score * 100)}
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
            {result.unregistered.length > 0 && (
              <div className="unregistered">
                <h2>読み取れたが未登録のお酒</h2>
                <p>{result.unregistered.join("、")}</p>
                <span>写真から読み取ったメニューに含まれています。</span>
              </div>
            )}
          </>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
