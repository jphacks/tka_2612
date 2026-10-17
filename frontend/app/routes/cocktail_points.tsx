import { type FormEvent, useEffect, useState } from "react";
import { CocktailCloud, type FocusRequest } from "../cocktails/CocktailCloud";
import { BASES, mockCocktails } from "../cocktails/mock";
import { type SearchResult, searchCocktails } from "../cocktails/search";
import type { Cocktail } from "../cocktails/types";
import type { Route } from "./+types/cocktail_points";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "カクテル探索" },
    {
      name: "description",
      content: "好みの味やお酒の名前から、カクテルを地図のように探せます",
    },
  ];
}

export default function CocktailPoints() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [focus, setFocus] = useState<FocusRequest | null>(null);

  const focusOn = (id: number, zoomIn: boolean) => {
    setFocus((prev) => ({ id, zoomIn, key: (prev?.key ?? 0) + 1 }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = searchCocktails(query, mockCocktails);
    setResult(next);
    setNotFound(next === null && query.trim() !== "");
    // 最も一致したカクテルを選択状態にして、そこに近づく
    setSelectedId(next ? next.ranking[0] : null);
    if (next) focusOn(next.ranking[0], true);
  };

  const handleClear = () => {
    setQuery("");
    setResult(null);
    setNotFound(false);
  };

  const handleSelect = (id: number | null) => {
    setSelectedId(id);
    if (id !== null) focusOn(id, false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const selected = selectedId === null ? null : mockCocktails[selectedId];

  return (
    <main className="relative h-dvh overflow-hidden bg-slate-950 text-slate-100">
      <CocktailCloud
        cocktails={mockCocktails}
        relevance={result?.relevance ?? null}
        selectedId={selectedId}
        bestMatchId={result?.ranking[0] ?? null}
        focus={focus}
        onSelect={handleSelect}
      />

      <header className="pointer-events-none absolute inset-x-4 top-4">
        <h1 className="text-sm font-semibold">カクテル探索</h1>
        <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
          {BASES.map((b) => (
            <li key={b.name} className="flex items-center gap-1">
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: b.color }}
              />
              {b.name}
            </li>
          ))}
        </ul>
      </header>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-6">
        <div className="pointer-events-auto mx-auto flex max-w-xl flex-col gap-3">
          {selected && (
            <DetailCard
              cocktail={selected}
              relevance={result ? result.relevance[selected.id] : null}
              onClose={() => setSelectedId(null)}
            />
          )}
          {notFound && (
            <p className="text-center text-sm text-slate-400">
              一致するカクテルが見つかりませんでした
            </p>
          )}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/80 py-1.5 pl-5 pr-1.5 shadow-lg backdrop-blur focus-within:border-sky-400/60"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="好きな味やお酒の名前で探す"
              aria-label="カクテルを検索"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-base placeholder:text-slate-500 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="検索をクリア"
                className="grid size-9 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-slate-100"
              >
                ×
              </button>
            )}
            <button
              type="submit"
              aria-label="探す"
              className="grid size-9 place-items-center rounded-full bg-sky-500 text-slate-950 hover:bg-sky-400"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="size-4"
                aria-hidden="true"
              >
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="m13 13 4 4" strokeLinecap="round" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

type DetailCardProps = {
  cocktail: Cocktail;
  // 検索していないときは null
  relevance: number | null;
  onClose: () => void;
};

function DetailCard({ cocktail, relevance, onClose }: DetailCardProps) {
  const baseColor = BASES.find((b) => b.name === cocktail.base)?.color;

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/85 p-4 shadow-lg backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold leading-snug">{cocktail.name}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: baseColor }}
            />
            {cocktail.base}・{cocktail.abv}%
            {relevance !== null && (
              <span className="ml-1 text-sky-300">
                一致度 {Math.round(relevance * 100)}%
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="-mr-1.5 -mt-1.5 grid size-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-slate-100"
        >
          ×
        </button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        {cocktail.description}
      </p>
    </section>
  );
}
