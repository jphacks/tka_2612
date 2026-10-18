import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { BASE_GROUPS } from "../cocktails/bases";
import { CocktailCloud, type FocusRequest } from "../cocktails/CocktailCloud";
import type { Layout } from "../cocktails/cloudScene";
import {
  type CocktailPoint,
  fetchCocktailPoints,
  searchNearby,
} from "../cocktails/cocktailData";
import { createUmapClient, type UmapClient } from "../cocktails/umapClient";
import { SiteHeader } from "../components/site-chrome";
import { baseTags, englishName } from "../lib/cocktail-display";
import {
  clearMenuScan,
  getMenuScanState,
  getServerMenuScanState,
  subscribeMenuScan,
} from "../lib/menu-scan-task";
import type { Route } from "./+types/cocktail_points";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "カクテルの地図 — SIP" },
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
  const location = useLocation();
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
    <main className="site-shell map-page">
      <SiteHeader>
        <Link className="topbar-link" to="/">
          ← ホーム
        </Link>
      </SiteHeader>
      <h1 className="sr-only">カクテルの地図</h1>

      <ul className="map-legend" aria-label="点の色とベースのお酒">
        {BASE_GROUPS.map((b) => (
          <li key={b.name}>
            <span style={{ backgroundColor: b.color, color: b.color }} />
            {b.name}
          </li>
        ))}
      </ul>

      <div className="map">
        <CocktailCloud
          layout={layout}
          selectedId={selectedId}
          bestMatchId={bestMatchId}
          focus={focus}
          onSelect={handleSelect}
        />

        <MenuScanBanner />
        <div className="map-panel">
          {selected && (
            <DetailCard
              cocktail={selected}
              score={scores?.get(selected.id) ?? null}
              backTo={`${location.pathname}${location.search}`}
              onClose={() => setSelectedId(null)}
            />
          )}
        </div>

        <div className="map-bottom">
          {status && (
            <p className="map-status" aria-live="polite">
              {status}
            </p>
          )}
          <form className="map-search" onSubmit={handleSubmit}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="味や気分で探す"
              aria-label="カクテルを検索"
            />
            {query && (
              <button
                type="button"
                className="map-search-clear"
                onClick={handleClear}
                aria-label="検索をクリア"
              >
                ×
              </button>
            )}
            <button
              type="submit"
              className="map-search-submit"
              disabled={points.length === 0}
              aria-label="探す"
            >
              →
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
    <section className="map-banner" aria-live="polite">
      {scan.status === "scanning" && (
        <>
          <span className="spinner" aria-hidden="true" />
          <p>メニューを読み取り中…</p>
        </>
      )}
      {scan.status === "done" && (
        <>
          <p>メニューを読み取りました</p>
          <button
            type="button"
            className="pill-button"
            onClick={() => {
              clearMenuScan();
              navigate("/cocktails");
            }}
          >
            おすすめを見る →
          </button>
        </>
      )}
      {scan.status === "failed" && (
        <>
          <p className="page-error" role="alert">
            {scan.message}
          </p>
          <button
            type="button"
            className="close-button"
            onClick={clearMenuScan}
            aria-label="閉じる"
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
  // 入力文との相性（コサイン類似度）。検索していないときは null
  score: number | null;
  // 詳細ページの「戻る」で戻ってくる先（今の地図の URL）
  backTo: string;
  onClose: () => void;
};

function DetailCard({ cocktail, score, backTo, onClose }: DetailCardProps) {
  return (
    <section className="map-card" aria-label={cocktail.name}>
      <div className="map-card-head">
        <div>
          <h2>{cocktail.name}</h2>
          <p className="drink-en">{englishName(cocktail)}</p>
        </div>
        {score !== null && (
          <p className="score" title="相性">
            {Math.round(score * 100)}
            <small>%</small>
          </p>
        )}
        <button
          type="button"
          className="close-button"
          onClick={onClose}
          aria-label="閉じる"
        >
          ×
        </button>
      </div>
      <p className="map-card-text">{cocktail.description}</p>
      <div className="map-card-foot">
        <div className="tags">
          {baseTags(cocktail).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <Link
          className="text-link"
          to={`/cocktails/${cocktail.id}`}
          state={{ backTo, score }}
        >
          詳しく →
        </Link>
      </div>
    </section>
  );
}
