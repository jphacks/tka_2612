import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { BASE_GROUPS, baseLabel } from "../cocktails/bases";
import { CocktailCloud, type FocusRequest } from "../cocktails/CocktailCloud";
import type { Layout } from "../cocktails/cloudScene";
import {
  type CocktailPoint,
  fetchCocktailPoints,
  searchNearby,
} from "../cocktails/cocktailData";
import { createUmapClient, type UmapClient } from "../cocktails/umapClient";
import {
  clearMenuScan,
  getMenuScanState,
  getServerMenuScanState,
  subscribeMenuScan,
} from "../lib/menu-scan-task";
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

// 一致度（コサイン類似度）は差が小さいので、集めた範囲の中で広げて点の大きさに使う
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
  // ホームから来たときは ?q= に入力文が入っている
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQueryRef = useRef(searchParams.get("q")?.trim() ?? "");
  const [query, setQuery] = useState(initialQueryRef.current);
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
    let cancelled = false;
    (async () => {
      try {
        const loaded = await fetchCocktailPoints();
        if (cancelled) return;
        setPoints(loaded);

        // 入力文があれば、全件の配置より先に検索結果を出す（UMAP は1件ずつ順に計算されるため）
        const initialQuery = initialQueryRef.current;
        const found =
          initialQuery !== "" &&
          (await runSearchRef.current?.(
            initialQuery,
            new Map(loaded.map((p) => [p.id, p])),
            client,
          ));
        if (cancelled) return;

        // 検索しなかった・失敗したときは全件を表示する（クリアしたときにも使う）
        const request = requestRef.current;
        if (!found) setStatus("マップを計算しています…");
        allLayoutRef.current = projectAll(client, loaded);
        const all = await allLayoutRef.current;
        if (cancelled || found || request !== requestRef.current) return;
        setLayout(all);
        if (initialQuery === "") setStatus(null);
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
    const client = umapRef.current;
    if (!client || points.length === 0) return;
    const request = ++requestRef.current;
    if (!allLayoutRef.current) setStatus("マップを計算しています…");
    allLayoutRef.current ??= projectAll(client, points);
    const all = await allLayoutRef.current;
    if (request !== requestRef.current) return;
    setLayout(all);
    setStatus(null);
  };

  // 入力に近いカクテルだけを集め、その中で UMAP をかけ直して表示する。表示できたら true
  const runSearch = async (
    text: string,
    byId: Map<string, CocktailPoint>,
    client: UmapClient,
  ): Promise<boolean> => {
    const request = ++requestRef.current;
    setStatus("検索しています…");
    try {
      const hit = await searchNearby(text, byId);
      if (request !== requestRef.current) return false;
      if (hit.cocktails.length === 0) {
        setStatus("近いカクテルが見つかりませんでした");
        return false;
      }
      setStatus("マップを計算しています…");
      const positions = await client.project(
        hit.cocktails.map((c) => c.vector),
      );
      if (request !== requestRef.current) return false;
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
      return true;
    } catch (error) {
      if (request === requestRef.current) setStatus(errorMessage(error));
      return false;
    }
  };
  // 読み込み時の effect から最新の runSearch を呼ぶための参照
  const runSearchRef = useRef<typeof runSearch | null>(null);
  useEffect(() => {
    runSearchRef.current = runSearch;
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = query.trim();
    if (text === "") {
      handleClear();
      return;
    }
    const client = umapRef.current;
    if (!client || points.length === 0) return;
    // 再読み込みや共有をしても同じ検索結果になるよう、入力文を URL に残す
    setSearchParams({ q: text }, { replace: true });
    await runSearch(text, pointsById, client);
  };

  const handleClear = () => {
    setQuery("");
    setScores(null);
    setBestMatchId(null);
    setSelectedId(null);
    setSearchParams({}, { replace: true });
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
          {BASE_GROUPS.map((b) => (
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
          <MenuScanBanner />
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

// ホームで始めたメニューの読み取りの状況。終わったら、メニューから選んだおすすめへ進める
function MenuScanBanner() {
  const navigate = useNavigate();
  const scan = useSyncExternalStore(
    subscribeMenuScan,
    getMenuScanState,
    getServerMenuScanState,
  );
  if (scan.status === "idle") return null;

  return (
    <section
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/85 px-4 py-3 text-sm shadow-lg backdrop-blur"
      aria-live="polite"
    >
      {scan.status === "scanning" && (
        <>
          <span
            className="size-4 shrink-0 animate-spin rounded-full border-2 border-sky-400 border-t-transparent"
            aria-hidden="true"
          />
          <p className="flex-1 text-slate-300">
            メニューを読み取っています。終わるまで地図を眺めてお待ちください
          </p>
        </>
      )}
      {scan.status === "done" && (
        <>
          <p className="flex-1 text-slate-100">
            メニューの読み取りが終わりました
          </p>
          <button
            type="button"
            onClick={() => {
              clearMenuScan();
              navigate("/cocktails");
            }}
            className="shrink-0 rounded-full bg-sky-500 px-4 py-1.5 font-semibold text-slate-950 hover:bg-sky-400"
          >
            おすすめを見る
          </button>
        </>
      )}
      {scan.status === "failed" && (
        <>
          <p className="flex-1 text-rose-300" role="alert">
            {scan.message}
          </p>
          <button
            type="button"
            onClick={clearMenuScan}
            aria-label="閉じる"
            className="grid size-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-slate-100"
          >
            ×
          </button>
        </>
      )}
    </section>
  );
}

type DetailCardProps = {
  cocktail: CocktailPoint;
  // 入力文との一致度（コサイン類似度）。検索していないときは null
  score: number | null;
  onClose: () => void;
};

function DetailCard({ cocktail, score, onClose }: DetailCardProps) {
  const baseColor = BASE_GROUPS.find(
    (g) => g.name === cocktail.baseGroup,
  )?.color;

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
            {baseLabel(cocktail.bases)}
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
      <Link
        to={`/cocktails/${cocktail.id}`}
        className="mt-3 inline-block text-sm text-sky-300 hover:text-sky-200"
      >
        詳しく見る →
      </Link>
    </section>
  );
}
