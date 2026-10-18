import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  type FavoriteCount,
  type KeywordCount,
  listFavoriteCounts,
  listPopularKeywords,
} from "~/api/generated";
import { NeonGlass } from "~/components/neon-glass";
import { SiteHeader } from "~/components/site-chrome";
import { drinkColor, englishName } from "~/lib/cocktail-display";
import type { Route } from "./+types/trends";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "みんなの好み — カクテルタスケル" },
    {
      name: "description",
      content: "よく探されている言葉と、お気に入りの多いお酒を紹介します。",
    },
  ];
}

// ワードクラウドに出す言葉の数と、ランキングに出すお酒の数
const KEYWORD_LIMIT = 40;
const RANKING_LIMIT = 10;

// 言葉の色。地図の点と同じネオンの色を順に使う
const WORD_COLORS = ["#ff8a5c", "#ff4f8b", "#e07bff", "#7cd3ff", "#ffc35c"];

// 大きい言葉が中央に集まるよう、多い順の言葉を左右交互に並べる
function centerLargest<T>(items: T[]): T[] {
  const left: T[] = [];
  const right: T[] = [];
  items.forEach((item, i) => {
    (i % 2 === 0 ? right : left).push(item);
  });
  return [...left.reverse(), ...right];
}

type LoadState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | {
      status: "error";
    };

export default function Trends() {
  const [keywords, setKeywords] = useState<LoadState<KeywordCount[]>>({
    status: "loading",
  });
  const [favorites, setFavorites] = useState<LoadState<FavoriteCount[]>>({
    status: "loading",
  });

  useEffect(() => {
    listPopularKeywords({ limit: KEYWORD_LIMIT })
      .then((res) =>
        setKeywords(
          res.status === 200
            ? { status: "ready", data: res.data }
            : { status: "error" },
        ),
      )
      .catch(() => setKeywords({ status: "error" }));
    listFavoriteCounts()
      .then((res) =>
        setFavorites(
          res.status === 200
            ? { status: "ready", data: res.data.slice(0, RANKING_LIMIT) }
            : { status: "error" },
        ),
      )
      .catch(() => setFavorites({ status: "error" }));
  }, []);

  return (
    <main className="site-shell">
      <SiteHeader>
        <Link className="topbar-link" to="/">
          ← ホーム
        </Link>
      </SiteHeader>

      <div className="page trends">
        <h1 className="page-title">みんなの好み</h1>

        <section className="trends-section" aria-labelledby="keywords-title">
          <h2 id="keywords-title">よく探される言葉</h2>
          {keywords.status === "loading" && <p className="page-note">…</p>}
          {keywords.status === "error" && (
            <p className="page-error">読み込めませんでした</p>
          )}
          {keywords.status === "ready" &&
            (keywords.data.length === 0 ? (
              <p className="page-note">まだ検索がありません</p>
            ) : (
              <ul className="word-cloud">
                {centerLargest(keywords.data).map(({ word, count, weight }) => (
                  <li key={word}>
                    {/* 言葉を押すと、その言葉で地図を探す */}
                    <Link
                      to={`/cocktail_points?q=${encodeURIComponent(word)}`}
                      title={`${count}回`}
                      style={{
                        color: WORD_COLORS[word.length % WORD_COLORS.length],
                        // 狭い画面では大きい言葉ほど縮め、雲が縦に伸びすぎないようにする
                        fontSize: `calc(14px + ${weight} * min(34px, 6vw))`,
                        opacity: 0.5 + weight * 0.5,
                        textShadow:
                          weight > 0.6 ? "0 0 14px currentColor" : undefined,
                      }}
                    >
                      {word}
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
        </section>

        <section className="trends-section" aria-labelledby="ranking-title">
          <h2 id="ranking-title">お気に入りランキング</h2>
          {favorites.status === "loading" && <p className="page-note">…</p>}
          {favorites.status === "error" && (
            <p className="page-error">読み込めませんでした</p>
          )}
          {favorites.status === "ready" &&
            (favorites.data.length === 0 ? (
              <p className="page-note">まだお気に入りがありません</p>
            ) : (
              <ol className="drink-list ranking-list">
                {favorites.data.map(({ cocktail, favorite_count }, i) => (
                  <li key={cocktail.id}>
                    <Link
                      className={`drink-card ranking-card${i < 3 ? " is-top" : ""}`}
                      to={`/cocktails/${cocktail.id}`}
                    >
                      <span className="ranking-rank">{i + 1}</span>
                      <NeonGlass color={drinkColor(cocktail)} />
                      <div className="drink-body">
                        <h3>{cocktail.name}</h3>
                        <p className="drink-en">{englishName(cocktail)}</p>
                      </div>
                      <p className="ranking-count">
                        <span aria-hidden="true">♥</span> {favorite_count}
                        <span className="sr-only">人がお気に入り</span>
                      </p>
                    </Link>
                  </li>
                ))}
              </ol>
            ))}
        </section>
      </div>
    </main>
  );
}
