import { useEffect, useState } from "react";
import type { Cocktail } from "~/api/generated";
import { DrinkCard, DrinkList } from "~/components/drink-card";
import {
  BackLink,
  Page,
  SiteHeader,
  SiteShell,
} from "~/components/site-chrome";
import { Message, PageSub, PageTitle, TextLink } from "~/components/ui";
import { detailLinkState } from "~/lib/detail-link";
import { loadFavorites } from "~/lib/favorites";
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
    loadFavorites()
      .then((cocktails) => setState({ status: "ready", cocktails }))
      .catch(() => setState({ status: "error" }));
  }, []);

  return (
    <SiteShell>
      <SiteHeader>
        <BackLink to="/" label="ホーム" />
      </SiteHeader>

      <Page aria-labelledby="favorites-title">
        <PageTitle id="favorites-title">お気に入り</PageTitle>

        {state.status === "loading" && <Message>…</Message>}
        {state.status === "error" && (
          <Message role="alert">お気に入りを読み込めませんでした</Message>
        )}
        {state.status === "ready" &&
          (state.cocktails.length === 0 ? (
            <Message>
              <p>まだお気に入りがありません</p>
              <TextLink to="/cocktail_points">地図で探す →</TextLink>
            </Message>
          ) : (
            <>
              <PageSub>{state.cocktails.length}杯</PageSub>
              <DrinkList>
                {state.cocktails.map((cocktail) => (
                  <DrinkCard
                    key={cocktail.id}
                    cocktail={cocktail}
                    // 詳細ページの「戻る」で、この一覧に戻ってこられるようにする
                    state={detailLinkState("/favorites", "お気に入り")}
                    aside={
                      <span
                        className="text-neon text-xl text-shadow-halo"
                        aria-hidden="true"
                      >
                        ♥
                      </span>
                    }
                  />
                ))}
              </DrinkList>
            </>
          ))}
      </Page>
    </SiteShell>
  );
}
