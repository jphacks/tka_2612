import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { BASE_GROUPS } from "~/cocktails/bases";
import { CocktailCloud, type FocusRequest } from "~/cocktails/CocktailCloud";
import type { Layout } from "~/cocktails/cloudScene";
import {
  type CocktailPoint,
  fetchCocktailPoints,
  searchNearby,
} from "~/cocktails/cocktailData";
import { createUmapClient, type UmapClient } from "~/cocktails/umapClient";
import { BackLink, SiteHeader, SiteShell } from "~/components/site-chrome";
import {
  CloseButton,
  EnglishName,
  ErrorText,
  GlowButton,
  Score,
  Tags,
  TextLink,
} from "~/components/ui";
import { baseTags, englishName } from "~/lib/cocktail-display";
import { cx } from "~/lib/cx";
import { detailLinkState } from "~/lib/detail-link";
import {
  clearMenuScan,
  getMenuScanState,
  getServerMenuScanState,
  subscribeMenuScan,
} from "~/lib/menu-scan-task";
import type { Route } from "./+types/cocktail_points";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "カクテルの地図 — カクテルタスケル" },
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
    <SiteShell className="flex h-dvh flex-col">
      <SiteHeader>
        <BackLink to="/" label="ホーム" />
      </SiteHeader>
      <h1 className="sr-only">カクテルの地図</h1>

      <ul
        className="mx-auto mb-3 flex w-full max-w-290 flex-wrap gap-x-4 gap-y-1.5 px-5 text-muted text-xs max-md:mb-2.5 max-md:flex-nowrap max-md:overflow-x-auto max-md:pb-1 max-md:whitespace-nowrap max-md:[scrollbar-width:none]"
        aria-label="点の色とベースのお酒"
      >
        {BASE_GROUPS.map((b) => (
          <li className="flex shrink-0 items-center gap-1.5" key={b.name}>
            <span
              className="size-1.75 rounded-full shadow-[0_0_6px_currentColor]"
              style={{ backgroundColor: b.color, color: b.color }}
            />
            {b.name}
          </li>
        ))}
      </ul>

      {/* 地図は画面の高さいっぱいに広げる（スマホでは画面の端まで） */}
      <div className="mx-auto min-h-0 w-full max-w-290 flex-1 px-5 pb-5 max-md:p-0">
        <div className="relative size-full overflow-hidden rounded-3xl border border-line bg-black/22 bg-radial-[70%_60%_at_50%_40%] from-violet/10 to-transparent max-md:rounded-none max-md:border-x-0 max-md:border-b-0">
          <CocktailCloud
            layout={layout}
            selectedId={selectedId}
            bestMatchId={bestMatchId}
            focus={focus}
            onSelect={handleSelect}
          />

          {/* 読み取りの状況と選んだお酒のカード。地図の中央（選んだ点）を隠さないよう、
              広い画面では右上に縦に並べ、スマホでは読み取りの状況を上端、カードを検索欄の上に出す */}
          <div className="pointer-events-none absolute top-4 right-4 bottom-28 flex w-90 max-w-[calc(100%-2rem)] flex-col gap-3 max-md:inset-x-3 max-md:top-3 max-md:w-auto max-md:max-w-none">
            <MenuScanBanner />
            {selected && (
              <DetailCard
                cocktail={selected}
                score={scores?.get(selected.id) ?? null}
                backTo={`${location.pathname}${location.search}`}
                onClose={() => setSelectedId(null)}
              />
            )}
          </div>

          {/* 地図の下側に重ねる、検索の状況と検索欄 */}
          <div className="pointer-events-none absolute inset-x-4 bottom-4 mx-auto flex max-w-140 flex-col gap-2.5 max-md:inset-x-3 max-md:bottom-3">
            {status && (
              <p
                className="text-center text-muted text-sm text-shadow-halo text-shadow-night"
                aria-live="polite"
              >
                {status}
              </p>
            )}
            <form
              className={cx(
                FLOATING,
                "pointer-events-auto flex items-center gap-1 rounded-full py-1.5 pr-1.5 pl-4.5 transition-colors focus-within:border-neon/50",
              )}
              onSubmit={handleSubmit}
            >
              {/* iPhone は文字が 16px 未満の入力欄を選ぶと画面を拡大するため、16px にする */}
              <input
                className="min-w-0 flex-1 bg-transparent py-2 text-base text-ink outline-none placeholder:text-faint"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="味や気分で探す"
                aria-label="カクテルを検索"
              />
              {query && (
                <CloseButton onClick={handleClear} label="検索をクリア" />
              )}
              <button
                type="submit"
                className="grid size-11 place-items-center rounded-full bg-linear-120 from-sunset to-neon font-bold text-lg text-on-glow shadow-glow disabled:cursor-wait disabled:opacity-50"
                disabled={points.length === 0}
                aria-label="探す"
              >
                →
              </button>
            </form>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

// 地図の上に浮かせるパネルの見た目
const FLOATING =
  "border border-line bg-night-2/82 shadow-float backdrop-blur-lg";

// 読み取りの状態ごとのバナーの縁。読み取り中は縁に光を回し、終わったらネオンで光らせる
const BANNER_TONE = {
  scanning: "scan-border",
  done: "border border-neon/55 bg-night-2/82 shadow-halo shadow-neon/35",
  failed: "border border-line bg-night-2/82 shadow-float",
} as const;

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
      className={cx(
        "pointer-events-auto flex shrink-0 items-center gap-3 rounded-2xl py-2.5 pr-2.5 pl-4 text-muted text-sm backdrop-blur-lg",
        BANNER_TONE[scan.status],
      )}
      aria-live="polite"
      aria-busy={scan.status === "scanning"}
    >
      {/* 読み取っている写真。読み取り中は光の帯が上下に走り、終わったら印を付ける */}
      <div
        className="relative size-13 shrink-0 overflow-hidden rounded-xl bg-glass"
        aria-hidden="true"
      >
        <img
          className="size-full object-cover brightness-70"
          src={scan.previewUrl}
          alt=""
        />
        {scan.status === "scanning" && (
          <span className="absolute inset-x-0 top-0 h-1/3 animate-scan-beam bg-linear-to-b from-transparent via-neon/75 to-transparent shadow-halo" />
        )}
        {scan.status === "done" && (
          <span className="absolute inset-0 grid animate-pop place-items-center bg-neon/35 font-extrabold text-2xl text-white text-shadow-halo text-shadow-neon">
            ✓
          </span>
        )}
      </div>
      {scan.status === "scanning" && (
        <div className="grid min-w-0 flex-1 gap-2.5">
          <p className="font-bold text-base text-ink">メニューを読み取り中</p>
          {/* 終わりの見えない処理なので、流れ続ける進捗バーにする */}
          <span className="relative block h-1 overflow-hidden rounded-full bg-white/10">
            <span className="absolute inset-y-0 left-0 w-2/5 animate-scan-bar rounded-full bg-linear-to-r from-sunset to-neon shadow-halo" />
          </span>
        </div>
      )}
      {scan.status === "done" && (
        <>
          <p className="flex-1">読み取りました</p>
          <GlowButton
            type="button"
            onClick={() => {
              clearMenuScan();
              navigate("/cocktails");
            }}
          >
            おすすめを見る →
          </GlowButton>
        </>
      )}
      {scan.status === "failed" && (
        <>
          <ErrorText className="flex-1" role="alert">
            {scan.message}
          </ErrorText>
          <CloseButton onClick={clearMenuScan} />
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

// 選んだお酒のカード。長い説明で選んだ点が隠れないよう、スマホでは説明を短くする（全文は詳細ページで読める）
function DetailCard({ cocktail, score, backTo, onClose }: DetailCardProps) {
  return (
    <section
      className={cx(
        FLOATING,
        "pointer-events-auto min-h-0 animate-reveal overflow-y-auto rounded-2xl px-4.5 py-4 max-md:mt-auto max-md:max-h-[55%]",
      )}
      aria-label={cocktail.name}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-lg">{cocktail.name}</h2>
          <EnglishName>{englishName(cocktail)}</EnglishName>
        </div>
        {score !== null && <Score value={score} />}
        <CloseButton className="-mt-1.5 -mr-2" onClick={onClose} />
      </div>
      <p className="mt-2.5 text-muted text-sm leading-relaxed max-md:line-clamp-2">
        {cocktail.description}
      </p>
      <div className="mt-3.5 flex items-center justify-between gap-3">
        <Tags items={baseTags(cocktail)} />
        <TextLink
          className="shrink-0"
          to={`/cocktails/${cocktail.id}`}
          state={detailLinkState(backTo, "地図", score)}
        >
          詳しく →
        </TextLink>
      </div>
    </section>
  );
}
