import { useEffect, useState } from "react";
import { Link } from "react-router";
import { type Cocktail, listFavorites } from "~/api/generated";
import { NeonGlass } from "~/components/neon-glass";
import { SiteHeader } from "~/components/site-chrome";
import { drinkColor, englishName } from "~/lib/cocktail-display";
import { getDeviceId } from "~/lib/favorites";
import type { Route } from "./+types/favorites";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "お気に入り — カクテルタスケル" },
    {
      name: "description",
      content: "お気に入りに登録したカクテルを見返せます。",
    },
  ];
}

type LoadState =
  | { status: "loading" }
  | { status: "ready"; cocktails: Cocktail[] }
  | { status: "error" };

// この端末でお気に入りに登録したカクテルの一覧（新しく登録した順）
export default function Favorites() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    listFavorites({ device_id: getDeviceId() })
      .then((response) =>
        setState(
          response.status === 200
            ? { status: "ready", cocktails: response.data }
            : { status: "error" },
        ),
      )
      .catch(() => setState({ status: "error" }));
  }, []);

  return (
    <main className="site-shell">
      <SiteHeader>
        <Link className="topbar-link" to="/">
          ← ホーム
        </Link>
      </SiteHeader>

      <section className="page" aria-labelledby="favorites-title">
        <h1 className="page-title" id="favorites-title">
          お気に入り
        </h1>

        {state.status === "loading" && <p className="page-message">…</p>}
        {state.status === "error" && (
          <p className="page-message" role="alert">
            お気に入りを読み込めませんでした
          </p>
        )}
        {state.status === "ready" &&
          (state.cocktails.length === 0 ? (
            <div className="page-message">
              <p>まだお気に入りがありません</p>
              <Link className="text-link" to="/cocktail_points">
                地図で探す →
              </Link>
            </div>
          ) : (
            <>
              <p className="page-sub">{state.cocktails.length}杯</p>
              <ol className="drink-list">
                {state.cocktails.map((cocktail) => (
                  <li key={cocktail.id}>
                    {/* 詳細ページの「戻る」で、この一覧に戻ってこられるようにする */}
                    <Link
                      className="drink-card"
                      to={`/cocktails/${cocktail.id}`}
                      state={{
                        backTo: "/favorites",
                        backLabel: "お気に入り",
                        score: null,
                      }}
                    >
                      <NeonGlass color={drinkColor(cocktail)} />
                      <div className="drink-body">
                        <h2>{cocktail.name}</h2>
                        <p className="drink-en">{englishName(cocktail)}</p>
                        <p className="drink-desc">{cocktail.description}</p>
                      </div>
                      <span className="fav-mark" aria-hidden="true">
                        ♥
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </>
          ))}
      </section>
    </main>
  );
}
