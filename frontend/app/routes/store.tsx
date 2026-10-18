import { type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router";
import {
  type FavoriteCount,
  type KeywordCount,
  listFavoriteCounts,
  listPopularKeywords,
  listPopularQueries,
  type QueryCount,
} from "~/api/generated";
import { baseTags } from "~/lib/cocktail-display";
import { cx } from "~/lib/cx";
import type { Route } from "./+types/store";

// バーの店長向けのトレンドレポート。利用者向けの画面とは別のページで、
// 利用者向けの画面からはリンクしない（トレンド情報として店舗に提供する想定）
export function meta(_: Route.MetaArgs) {
  return [
    { title: "トレンドレポート — カクテルタスケル for Bar" },
    {
      name: "description",
      content:
        "お客さんがどんな味を探しているか、どのお酒が好まれているかを集計します。",
    },
  ];
}

// 集計する期間。null はすべての期間
const PERIODS = [
  { label: "全期間", days: null },
  { label: "30日", days: 30 },
  { label: "7日", days: 7 },
] as const;

type Days = (typeof PERIODS)[number]["days"];

const BAR_LIMIT = 15;
const CLOUD_LIMIT = 40;
const TABLE_LIMIT = 10;

// ワードクラウドの色。青1色の濃淡で、よく使われる言葉ほど濃くする。
// 文字として読めるよう、背景との差が小さい明るい側の段階は使わない
const CLOUD_RAMP = ["#5598e7", "#2a78d6", "#1c5cab", "#104281", "#0d366b"];

type Report = {
  keywords: KeywordCount[];
  queries: QueryCount[];
  favorites: FavoriteCount[];
};

async function fetchReport(days: Days): Promise<Report> {
  // 生成されたクライアントは null を "null" という文字で送ってしまうので、全期間は省いて送る
  const period = days ?? undefined;
  const [keywords, queries, favorites] = await Promise.all([
    listPopularKeywords({ limit: CLOUD_LIMIT, days: period }),
    listPopularQueries({ limit: TABLE_LIMIT, days: period }),
    listFavoriteCounts(),
  ]);
  if (
    keywords.status !== 200 ||
    queries.status !== 200 ||
    favorites.status !== 200
  ) {
    throw new Error("集計を読み込めませんでした");
  }
  return {
    keywords: keywords.data,
    queries: queries.data,
    favorites: favorites.data,
  };
}

function percent(part: number, total: number): string {
  return total === 0 ? "0%" : `${Math.round((part / total) * 100)}%`;
}

export default function Store() {
  const [days, setDays] = useState<Days>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchReport(days)
      .then((next) => {
        if (cancelled) return;
        setReport(next);
        setError("");
      })
      .catch(() => {
        if (!cancelled) setError("集計を読み込めませんでした");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const periodLabel = PERIODS.find((p) => p.days === days)?.label ?? "";

  return (
    <div
      className="min-h-dvh bg-biz-page font-biz text-biz-ink"
      data-theme="biz"
    >
      <header className="flex items-baseline gap-4 border-biz-border border-b bg-biz-surface px-[max(20px,50%-560px)] py-4.5 max-md:flex-col max-md:gap-1">
        <p className="font-bold text-biz-ink-2 text-sm">
          カクテルタスケル{" "}
          <span className="rounded bg-biz-accent-soft px-1.5 py-0.5 text-2xs text-biz-accent-ink">
            for Bar
          </span>
        </p>
        <h1 className="font-bold text-xl">トレンドレポート</h1>
        <Link className="mt-1.5 text-biz-ink-2 text-sm hover:underline" to="/">
          ← お客さま向けの画面へ
        </Link>
      </header>

      <main className="mx-auto max-w-290 px-5 pt-6 pb-16">
        {/* 期間は、下の検索に関する集計すべてに効く */}
        <fieldset
          className="mb-5 inline-flex rounded-lg border border-biz-border bg-biz-surface p-0.75"
          aria-label="集計する期間"
        >
          {PERIODS.map((p) => (
            <button
              className="min-h-8.5 rounded-md px-4 font-semibold text-biz-ink-2 text-sm hover:bg-biz-hover aria-pressed:bg-biz-ink aria-pressed:text-white"
              key={p.label}
              type="button"
              aria-pressed={p.days === days}
              onClick={() => setDays(p.days)}
            >
              {p.label}
            </button>
          ))}
        </fieldset>

        {error && (
          <p className="text-biz-error text-sm" role="alert">
            {error}
          </p>
        )}
        {!report && !error && <Empty>読み込んでいます…</Empty>}

        {report && (
          // 読み込み直しているあいだは、前の集計を薄く残して画面が跳ねないようにする
          <div
            className={cx(
              "grid gap-4 transition-opacity",
              isLoading && "opacity-50",
            )}
          >
            <Kpis report={report} periodLabel={periodLabel} />

            <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <Card
                id="keywords-title"
                title="よく使われる言葉"
                caption={`検索で入力された文から、味や気分を表す言葉を数えています（${periodLabel}）`}
              >
                <KeywordBars keywords={report.keywords.slice(0, BAR_LIMIT)} />
              </Card>

              {/* ワードクラウドは、隣の横棒グラフと同じ高さのカードの中で上下の中央に置く */}
              <Card
                id="cloud-title"
                title="言葉の広がり"
                caption={`上位${CLOUD_LIMIT}語。大きく濃いほどよく使われています`}
                className="flex flex-col"
              >
                <WordCloud keywords={report.keywords} />
              </Card>
            </div>

            <Card
              id="queries-title"
              title="よく入力された文"
              caption={`入力された文そのままの上位（${periodLabel}）`}
            >
              <QueryTable queries={report.queries} />
            </Card>

            <Card
              id="favorites-title"
              title="お気に入りランキング"
              caption="お気に入りに登録された数の上位（全期間。期間では絞り込めません）"
            >
              <FavoriteTable
                favorites={report.favorites.slice(0, TABLE_LIMIT)}
              />
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

const PANEL = "rounded-xl border border-biz-border bg-biz-surface";

function Card({
  id,
  title,
  caption,
  className,
  children,
}: {
  id: string;
  title: string;
  caption: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cx(PANEL, "px-5 py-4.5", className)}
      aria-labelledby={id}
    >
      <h2 className="font-bold text-base" id={id}>
        {title}
      </h2>
      <p className="mt-1 mb-4 text-biz-muted text-xs">{caption}</p>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-biz-muted text-sm">{children}</p>;
}

function Kpis({
  report,
  periodLabel,
}: {
  report: Report;
  periodLabel: string;
}) {
  const top = report.keywords[0];
  const totalFavorites = report.favorites.reduce(
    (sum, f) => sum + f.favorite_count,
    0,
  );
  return (
    // 縦に積むと長くなるので、スマホでも3つを横に並べたまま小さくする
    <div className="grid grid-cols-3 gap-4 max-md:gap-2">
      <Kpi
        label={`いちばん使われた言葉（${periodLabel}）`}
        value={top ? top.word : "—"}
        sub={top ? `${top.count}回` : "まだ検索がありません"}
      />
      <Kpi
        label="お気に入りの総数"
        value={totalFavorites.toLocaleString()}
        sub="全期間"
      />
      <Kpi
        label="お気に入りされたお酒"
        value={report.favorites.length.toLocaleString()}
        sub="種類・全期間"
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className={cx(PANEL, "px-5 py-4.5 max-md:p-3")}>
      <p className="text-biz-ink-2 text-sm max-md:text-2xs">{label}</p>
      <p className="mt-1.5 wrap-anywhere font-semibold text-3xl leading-tight max-md:text-xl">
        {value}
      </p>
      <p className="mt-1 text-biz-muted text-xs max-md:text-2xs">{sub}</p>
    </div>
  );
}

// 横棒グラフ。値は棒の先に書き、マウスを乗せると全体に占める割合も出す
// （割合は読み上げ用の文字としても入れ、マウスがなくても伝わるようにする）
function KeywordBars({ keywords }: { keywords: KeywordCount[] }) {
  if (keywords.length === 0) {
    return <Empty>この期間の検索はまだありません</Empty>;
  }
  const max = keywords[0].count;
  const total = keywords.reduce((sum, k) => sum + k.count, 0);
  return (
    <ol className="grid gap-1.5">
      {keywords.map(({ word, count }) => (
        <li
          className="group relative grid min-h-6.5 grid-cols-[7em_minmax(0,1fr)] items-center gap-3"
          key={word}
        >
          <span className="truncate text-right text-biz-ink-2 text-sm">
            {word}
          </span>
          {/* 棒は細く、先だけ丸め、値は棒の先に書く */}
          <span className="flex items-center gap-2 border-biz-grid border-l">
            <span
              className="h-3.5 min-w-0.5 rounded-r bg-biz-accent transition group-hover:brightness-115"
              style={{ width: `${(count / max) * 100}%` }}
            />
            <span className="text-biz-ink-2 text-xs tabular-nums">
              {count}
              <span className="sr-only">
                回、上位の言葉の{percent(count, total)}
              </span>
            </span>
          </span>
          <span
            className="pointer-events-none absolute -top-8.5 left-[7em] z-10 hidden whitespace-nowrap rounded-md bg-biz-ink px-2.5 py-1.5 text-biz-hover text-xs group-hover:block"
            aria-hidden="true"
          >
            <strong className="mr-1.5 text-white">{count}回</strong>
            {word}・上位の言葉の {percent(count, total)}
          </span>
        </li>
      ))}
    </ol>
  );
}

// 大きい言葉が中央に集まるよう、多い順の言葉を左右交互に並べる
function centerLargest<T>(items: T[]): T[] {
  const left: T[] = [];
  const right: T[] = [];
  items.forEach((item, i) => {
    (i % 2 === 0 ? right : left).push(item);
  });
  return [...left.reverse(), ...right];
}

function WordCloud({ keywords }: { keywords: KeywordCount[] }) {
  if (keywords.length === 0) {
    return <Empty>この期間の検索はまだありません</Empty>;
  }
  return (
    <ul className="flex flex-1 flex-wrap content-center items-center justify-center gap-x-3.5 gap-y-1 py-2">
      {centerLargest(keywords).map(({ word, count, weight }) => (
        <li
          className="font-bold leading-snug"
          key={word}
          title={`${count}回`}
          style={{
            color:
              CLOUD_RAMP[
                Math.min(
                  CLOUD_RAMP.length - 1,
                  Math.floor(weight * CLOUD_RAMP.length),
                )
              ],
            fontSize: `calc(13px + ${weight} * min(28px, 5vw))`,
          }}
        >
          {word}
        </li>
      ))}
    </ul>
  );
}

function QueryTable({ queries }: { queries: QueryCount[] }) {
  if (queries.length === 0) {
    return <Empty>この期間の検索はまだありません</Empty>;
  }
  const max = queries[0].count;
  return (
    <table className={TABLE}>
      <thead>
        <tr>
          <th className={TH} scope="col">
            順位
          </th>
          <th className={TH} scope="col">
            入力された文
          </th>
          <th className={cx(TH, NUM)} scope="col">
            回数
          </th>
        </tr>
      </thead>
      <tbody>
        {queries.map(({ query, count }, i) => (
          <tr className={ROW} key={query}>
            <td className={cx(TD, RANK)}>{i + 1}</td>
            <td className={TD}>{query}</td>
            <td className={cx(TD, NUM)}>
              <Meter value={count} max={max} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FavoriteTable({ favorites }: { favorites: FavoriteCount[] }) {
  if (favorites.length === 0) {
    return <Empty>まだお気に入りがありません</Empty>;
  }
  const max = favorites[0].favorite_count;
  return (
    <table className={TABLE}>
      <thead>
        <tr>
          <th className={TH} scope="col">
            順位
          </th>
          <th className={TH} scope="col">
            お酒
          </th>
          <th className={cx(TH, SUB)} scope="col">
            ベース
          </th>
          <th className={cx(TH, NUM)} scope="col">
            お気に入り
          </th>
        </tr>
      </thead>
      <tbody>
        {favorites.map(({ cocktail, favorite_count }, i) => (
          <tr className={ROW} key={cocktail.id}>
            <td className={cx(TD, RANK)}>{i + 1}</td>
            <td className={TD}>{cocktail.name}</td>
            <td className={cx(TD, SUB, "text-biz-ink-2 text-sm")}>
              {baseTags(cocktail).join("・")}
            </td>
            <td className={cx(TD, NUM)}>
              <Meter value={favorite_count} max={max} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const TABLE = "w-full border-collapse text-sm";
const TH =
  "whitespace-nowrap border-biz-grid border-b px-2.5 py-2 text-left font-semibold text-biz-muted text-xs max-md:px-1.5";
const TD = "p-2.5 max-md:px-1.5";
const ROW = "border-biz-rule border-b last:border-0";
const RANK = "w-12 text-biz-muted tabular-nums";
const NUM = "whitespace-nowrap text-right";
// 狭い画面では、補足の列（ベース）は省いて、お酒の名前を読みやすくする
const SUB = "max-md:hidden";

// 数と、いちばん多いものに対する割合の棒
function Meter({ value, max }: { value: number; max: number }) {
  return (
    <span className="inline-flex items-center justify-end gap-2.5 tabular-nums">
      <span
        className="h-1.5 w-24 overflow-hidden rounded-sm bg-biz-accent-soft max-md:w-12"
        aria-hidden="true"
      >
        <span
          className="block h-full rounded-sm bg-biz-accent"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </span>
      {value.toLocaleString()}
    </span>
  );
}
