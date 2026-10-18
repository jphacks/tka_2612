import type { ReactNode } from "react";
import { Link } from "react-router";
import type { Cocktail } from "~/api/generated";
import { NeonGlass } from "~/components/neon-glass";
import { EnglishName } from "~/components/ui";
import { drinkColor, englishName } from "~/lib/cocktail-display";

export function DrinkList({ children }: { children: ReactNode }) {
  return <ol className="mt-7 grid gap-3">{children}</ol>;
}

// 一覧の1杯。押すと詳細ページへ。右側（aside）には相性やお気に入りの印を出す
export function DrinkCard({
  cocktail,
  state,
  aside,
}: {
  cocktail: Cocktail;
  // 詳細ページへ Link の state で渡す情報
  state?: unknown;
  aside?: ReactNode;
}) {
  return (
    <li>
      <Link
        className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-line bg-glass py-4 pr-5 pl-3.5 transition hover:-translate-y-0.5 hover:border-neon/40 hover:bg-glass-strong max-md:grid-cols-[44px_minmax(0,1fr)_auto] max-md:gap-3 max-md:py-3.5 max-md:pr-4 max-md:pl-2.5"
        to={`/cocktails/${cocktail.id}`}
        state={state}
      >
        <NeonGlass
          color={drinkColor(cocktail)}
          className="h-14 w-12 justify-self-center max-md:h-11 max-md:w-9.5"
        />
        <div>
          <h2 className="font-bold text-lg">{cocktail.name}</h2>
          <EnglishName>{englishName(cocktail)}</EnglishName>
          <p className="mt-1.5 line-clamp-2 text-muted text-sm leading-relaxed">
            {cocktail.description}
          </p>
        </div>
        {aside}
      </Link>
    </li>
  );
}
