import { type FormEvent, useState } from "react";
import { CocktailCloud, type FocusRequest } from "../cocktails/CocktailCloud";
import { BASES, mockCocktails } from "../cocktails/mock";
import { type SearchResult, searchCocktails } from "../cocktails/search";
import type { Cocktail } from "../cocktails/types";
import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "カクテル探索" },
    {
      name: "description",
      content: "好みの味やお酒の名前から、カクテルを3Dで探せます",
    },
  ];
}

const TOP_RESULT_COUNT = 5;

export default function Home() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [focus, setFocus] = useState<FocusRequest | null>(null);

  const focusOn = (id: number) => {
    setSelectedId(id);
    setFocus((prev) => ({ id, key: (prev?.key ?? 0) + 1 }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = searchCocktails(query, mockCocktails);
    setResult(next);
    setNotFound(next === null && query.trim() !== "");
    if (next) focusOn(next.ranking[0]);
  };

  const handleClear = () => {
    setQuery("");
    setResult(null);
    setNotFound(false);
    setSelectedId(null);
  };

  const selected = selectedId === null ? null : mockCocktails[selectedId];

  return (
    <main className="flex h-dvh flex-col bg-slate-950 text-slate-100">
      <div className="relative min-h-0 flex-1">
        <CocktailCloud
          cocktails={mockCocktails}
          relevance={result?.relevance ?? null}
          selectedId={selectedId}
          focus={focus}
          onSelect={setSelectedId}
        />

        <header className="pointer-events-none absolute left-4 top-4">
          <h1 className="text-lg font-semibold">カクテル探索</h1>
          <p className="text-xs text-slate-400">
            ドラッグで回転・ホイールで拡大・点をクリックで詳細
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-slate-300">
            {BASES.map((b) => (
              <li key={b.name} className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: b.color }}
                />
                {b.name}
              </li>
            ))}
          </ul>
        </header>

        {selected && (
          <DetailPanel
            cocktail={selected}
            result={result}
            onFocus={() => focusOn(selected.id)}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      <section className="border-t border-white/10 bg-slate-900 px-4 py-4">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="お酒の名前や好みを入力（例: さっぱりしたジン、甘めでミント）"
            aria-label="カクテルを検索"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-slate-950 px-4 py-3 text-base placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-sky-500 px-5 font-semibold text-slate-950 hover:bg-sky-400"
          >
            探す
          </button>
          {(result || notFound) && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg border border-white/15 px-4 text-slate-300 hover:bg-white/5"
            >
              クリア
            </button>
          )}
        </form>

        <div className="mx-auto mt-3 flex min-h-8 max-w-3xl flex-wrap items-center gap-2 text-sm">
          {notFound && (
            <p className="text-slate-400">
              一致するカクテルが見つかりませんでした
            </p>
          )}
          {result?.ranking.slice(0, TOP_RESULT_COUNT).map((id, rank) => (
            <button
              key={id}
              type="button"
              onClick={() => focusOn(id)}
              className={`rounded-full border px-3 py-1 ${
                id === selectedId
                  ? "border-sky-400 bg-sky-400/15 text-sky-200"
                  : "border-white/15 text-slate-300 hover:bg-white/5"
              }`}
            >
              {rank + 1}. {mockCocktails[id].name}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

type DetailPanelProps = {
  cocktail: Cocktail;
  result: SearchResult | null;
  onFocus: () => void;
  onClose: () => void;
};

function DetailPanel({ cocktail, result, onFocus, onClose }: DetailPanelProps) {
  const baseColor = BASES.find((b) => b.name === cocktail.base)?.color;
  const relevance = result ? result.relevance[cocktail.id] : null;
  const rank = result ? result.ranking.indexOf(cocktail.id) + 1 : null;

  return (
    <aside className="absolute inset-x-4 bottom-4 rounded-xl border border-white/10 bg-slate-900/90 p-4 shadow-xl backdrop-blur sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-4 sm:w-80">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold leading-snug">{cocktail.name}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="-mr-1 -mt-1 rounded px-2 text-slate-400 hover:bg-white/10 hover:text-slate-100"
        >
          ×
        </button>
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: baseColor }}
        />
        {cocktail.base}ベース・度数 {cocktail.abv}%
      </p>

      <div className="mt-3">
        <div className="flex justify-between text-xs text-slate-400">
          <span>関連度</span>
          <span>
            {relevance === null
              ? "検索すると表示されます"
              : `${Math.round(relevance * 100)}%（${rank}位）`}
          </span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-sky-400"
            style={{ width: `${(relevance ?? 0) * 100}%` }}
          />
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-200">
        {cocktail.description}
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {cocktail.tags.map((tag) => (
          <li
            key={tag}
            className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300"
          >
            {tag}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onFocus}
        className="mt-4 w-full rounded-lg border border-white/15 py-2 text-sm hover:bg-white/5"
      >
        このカクテルに近づく
      </button>
    </aside>
  );
}
