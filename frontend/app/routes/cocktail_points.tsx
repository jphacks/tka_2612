import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { BASES } from "../cocktails/bases";
import { CocktailCloud, type FocusRequest } from "../cocktails/CocktailCloud";
import type { Layout } from "../cocktails/cloudScene";
import {
  type CocktailPoint,
  fetchCocktailPoints,
  searchNearby,
} from "../cocktails/cocktailData";
import { createUmapClient, type UmapClient } from "../cocktails/umapClient";
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

// 全カクテルを UMAP で2次元にした配置（検索していないときに表示する）
async function projectAll(
  client: UmapClient,
  points: CocktailPoint[],
): Promise<Layout> {
  const positions = await client.project(points.map((p) => p.vector));
  return { cocktails: points, positions, relevance: null };
}

// 一致度（コサイン類似度）は差が小さいので、集めた範囲の中で広げて点の濃さ・大きさに使う
function toRelevance(scores: number[]): Float32Array {
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  return Float32Array.from(scores, (s) =>
    max === min ? 1 : 0.15 + (0.85 * (s - min)) / (max - min),
  );
}

function errorMessage(error: unknown): string {
  // fetch がサーバーにつながらないときは TypeError になる
  if (error instanceof TypeError) {
    return "サーバーに接続できませんでした。バックエンドが起動しているか確認してください";
  }
  return error instanceof Error ? error.message : "エラーが発生しました";
}

export default function CocktailPoints() {
  const [query, setQuery] = useState("");
  const [points, setPoints] = useState<CocktailPoint[]>([]);
  const [layout, setLayout] = useState<Layout | null>(null);
  // 検索欄の上に出す、読み込み・計算の状況や検索結果の説明
  const [status, setStatus] = useState<string | null>(
    "お酒のデータを読み込んでいます…",
  );
  // 表示中の検索結果の一致度（検索していなければ null）
  const [scores, setScores] = useState<Map<string, number> | null>(null);
  const [bestMatchId, setBestMatchId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const umapRef = useRef<UmapClient | null>(null);
  const allLayoutRef = useRef<Promise<Layout> | null>(null);
  // 古い検索や UMAP の結果で表示を上書きしないよう、最新の要求だけを反映する
  const requestRef = useRef(0);

  const pointsById = useMemo(
    () => new Map(points.map((p) => [p.id, p])),
    [points],
  );

  useEffect(() => {
    const client = createUmapClient();
    umapRef.current = client;
    const request = ++requestRef.current;
    let cancelled = false;
    (async () => {
      try {
        const loaded = await fetchCocktailPoints();
        if (cancelled) return;
        setPoints(loaded);
        setStatus("マップを計算しています…");
        allLayoutRef.current = projectAll(client, loaded);
        const all = await allLayoutRef.current;
        if (cancelled || request !== requestRef.current) return;
        setLayout(all);
        setStatus(null);
      } catch (error) {
        if (!cancelled) setStatus(errorMessage(error));
      }
    })();
    return () => {
      cancelled = true;
      client.dispose();
      umapRef.current = null;
      allLayoutRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const focusOn = (id: string, zoomIn: boolean) => {
    setFocus((prev) => ({ id, zoomIn, key: (prev?.key ?? 0) + 1 }));
  };

  const showAll = async () => {
    const allLayout = allLayoutRef.current;
    if (!allLayout) return;
    const request = ++requestRef.current;
    const all = await allLayout;
    if (request !== requestRef.current) return;
    setLayout(all);
    setStatus(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = query.trim();
    if (text === "") {
      handleClear();
      return;
    }
    const client = umapRef.current;
    if (!client || points.length === 0) return;

    const request = ++requestRef.current;
    setStatus("検索しています…");
    try {
      // 入力に近いカクテルだけを集め、その中で UMAP をかけ直す
      const hit = await searchNearby(text, pointsById);
      if (request !== requestRef.current) return;
      if (hit.cocktails.length === 0) {
        setStatus("近いカクテルが見つかりませんでした");
        return;
      }
      setStatus("マップを計算しています…");
      const positions = await client.project(
        hit.cocktails.map((c) => c.vector),
      );
      if (request !== requestRef.current) return;
      const best = hit.cocktails[0].id;
      setLayout({
        cocktails: hit.cocktails,
        positions,
        relevance: toRelevance(hit.scores),
      });
      setScores(new Map(hit.cocktails.map((c, i) => [c.id, hit.scores[i]])));
      setStatus(`「${text}」に近い ${hit.cocktails.length} 件`);
      // 最も一致したカクテルを選択状態にして、そこに近づく
      setBestMatchId(best);
      setSelectedId(best);
      focusOn(best, true);
    } catch (error) {
      if (request === requestRef.current) setStatus(errorMessage(error));
    }
  };

  const handleClear = () => {
    setQuery("");
    setScores(null);
    setBestMatchId(null);
    setSelectedId(null);
    showAll();
  };

  const handleSelect = (id: string | null) => {
    setSelectedId(id);
    if (id !== null) focusOn(id, false);
  };

  const selected =
    selectedId === null ? null : (pointsById.get(selectedId) ?? null);

  return (
    <main className="relative h-dvh overflow-hidden bg-slate-950 text-slate-100">
      <CocktailCloud
        layout={layout}
        selectedId={selectedId}
        bestMatchId={bestMatchId}
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
              score={scores?.get(selected.id) ?? null}
              onClose={() => setSelectedId(null)}
            />
          )}
          {status && (
            <p
              className="text-center text-sm text-slate-400"
              aria-live="polite"
            >
              {status}
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
              placeholder="好きな味や気分で探す（例: 甘くてフルーティ）"
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
              disabled={points.length === 0}
              className="grid size-9 place-items-center rounded-full bg-sky-500 text-slate-950 hover:bg-sky-400 disabled:opacity-40"
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
  cocktail: CocktailPoint;
  // 入力文との一致度（コサイン類似度）。検索していないときは null
  score: number | null;
  onClose: () => void;
};

function DetailCard({ cocktail, score, onClose }: DetailCardProps) {
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
            {cocktail.base}
            {score !== null && (
              <span className="ml-1 text-sky-300">
                一致度 {Math.round(score * 100)}%
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
      <p className="mt-2 text-xs text-slate-400">
        材料: {cocktail.ingredients.join("・")}
      </p>
    </section>
  );
}
