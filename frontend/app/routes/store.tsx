import { useEffect, useState } from "react";
import {
  type FavoriteCount,
  type KeywordCount,
  listFavoriteCounts,
  listPopularKeywords,
  listPopularQueries,
  type QueryCount,
} from "~/api/generated";
import { baseTags } from "~/lib/cocktail-display";
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
    <div className="biz">
      <header className="biz-header">
        <p className="biz-brand">
          カクテルタスケル <span>for Bar</span>
        </p>
        <h1>トレンドレポート</h1>
      </header>

      <main className="biz-main">
        {/* 期間は、下の検索に関する集計すべてに効く */}
        <fieldset className="biz-filter" aria-label="集計する期間">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              type="button"
              aria-pressed={p.days === days}
              className={p.days === days ? "is-active" : undefined}
              onClick={() => setDays(p.days)}
            >
              {p.label}
            </button>
          ))}
        </fieldset>

        {error && (
          <p className="biz-error" role="alert">
            {error}
          </p>
        )}
        {!report && !error && <p className="biz-empty">読み込んでいます…</p>}

        {report && (
          // 読み込み直しているあいだは、前の集計を薄く残して画面が跳ねないようにする
          <div className={`biz-body${isLoading ? " is-refreshing" : ""}`}>
            <Kpis report={report} periodLabel={periodLabel} />

            <div className="biz-grid">
              <section className="biz-card" aria-labelledby="keywords-title">
                <h2 id="keywords-title">よく使われる言葉</h2>
                <p className="biz-caption">
                  検索で入力された文から、味や気分を表す言葉を数えています（
                  {periodLabel}）
                </p>
                <KeywordBars keywords={report.keywords.slice(0, BAR_LIMIT)} />
              </section>

              <section className="biz-card" aria-labelledby="cloud-title">
                <h2 id="cloud-title">言葉の広がり</h2>
                <p className="biz-caption">
                  上位{CLOUD_LIMIT}語。大きく濃いほどよく使われています
                </p>
                <WordCloud keywords={report.keywords} />
              </section>
            </div>

            <section className="biz-card" aria-labelledby="queries-title">
              <h2 id="queries-title">よく入力された文</h2>
              <p className="biz-caption">
                入力された文そのままの上位（{periodLabel}）
              </p>
              <QueryTable queries={report.queries} />
            </section>

            <section className="biz-card" aria-labelledby="favorites-title">
              <h2 id="favorites-title">お気に入りランキング</h2>
              <p className="biz-caption">
                お気に入りに登録された数の上位（全期間。期間では絞り込めません）
              </p>
              <FavoriteTable
                favorites={report.favorites.slice(0, TABLE_LIMIT)}
              />
            </section>
          </div>
        )}
      </main>
    </div>
  );
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
    <div className="biz-kpis">
      <div className="biz-kpi">
        <p className="biz-kpi-label">いちばん使われた言葉（{periodLabel}）</p>
        <p className="biz-kpi-value">{top ? top.word : "—"}</p>
        <p className="biz-kpi-sub">
          {top ? `${top.count}回` : "まだ検索がありません"}
        </p>
      </div>
      <div className="biz-kpi">
        <p className="biz-kpi-label">お気に入りの総数</p>
        <p className="biz-kpi-value">{totalFavorites.toLocaleString()}</p>
        <p className="biz-kpi-sub">全期間</p>
      </div>
      <div className="biz-kpi">
        <p className="biz-kpi-label">お気に入りされたお酒</p>
        <p className="biz-kpi-value">
          {report.favorites.length.toLocaleString()}
        </p>
        <p className="biz-kpi-sub">種類・全期間</p>
      </div>
    </div>
  );
}

// 横棒グラフ。値は棒の先に書き、マウスを乗せると全体に占める割合も出す
// （割合は読み上げ用の文字としても入れ、マウスがなくても伝わるようにする）
function KeywordBars({ keywords }: { keywords: KeywordCount[] }) {
  if (keywords.length === 0) {
    return <p className="biz-empty">この期間の検索はまだありません</p>;
  }
  const max = keywords[0].count;
  const total = keywords.reduce((sum, k) => sum + k.count, 0);
  return (
    <ol className="biz-bars">
      {keywords.map(({ word, count }) => (
        <li key={word}>
          <span className="biz-bar-label">{word}</span>
          <span className="biz-bar-track">
            <span
              className="biz-bar"
              style={{ width: `${(count / max) * 100}%` }}
            />
            <span className="biz-bar-value">
              {count}
              <span className="sr-only">
                回、上位の言葉の{percent(count, total)}
              </span>
            </span>
          </span>
          <span className="biz-tooltip" aria-hidden="true">
            <strong>{count}回</strong>
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
    return <p className="biz-empty">この期間の検索はまだありません</p>;
  }
  return (
    <ul className="biz-cloud">
      {centerLargest(keywords).map(({ word, count, weight }) => (
        <li
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
    return <p className="biz-empty">この期間の検索はまだありません</p>;
  }
  const max = queries[0].count;
  return (
    <table className="biz-table">
      <thead>
        <tr>
          <th scope="col">順位</th>
          <th scope="col">入力された文</th>
          <th scope="col" className="is-num">
            回数
          </th>
        </tr>
      </thead>
      <tbody>
        {queries.map(({ query, count }, i) => (
          <tr key={query}>
            <td className="biz-rank">{i + 1}</td>
            <td>{query}</td>
            <td className="is-num">
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
    return <p className="biz-empty">まだお気に入りがありません</p>;
  }
  const max = favorites[0].favorite_count;
  return (
    <table className="biz-table">
      <thead>
        <tr>
          <th scope="col">順位</th>
          <th scope="col">お酒</th>
          <th scope="col" className="is-sub">
            ベース
          </th>
          <th scope="col" className="is-num">
            お気に入り
          </th>
        </tr>
      </thead>
      <tbody>
        {favorites.map(({ cocktail, favorite_count }, i) => (
          <tr key={cocktail.id}>
            <td className="biz-rank">{i + 1}</td>
            <td>{cocktail.name}</td>
            <td className="biz-muted is-sub">
              {baseTags(cocktail).join("・")}
            </td>
            <td className="is-num">
              <Meter value={favorite_count} max={max} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// 数と、いちばん多いものに対する割合の棒
function Meter({ value, max }: { value: number; max: number }) {
  return (
    <span className="biz-meter">
      <span className="biz-meter-track" aria-hidden="true">
        <span style={{ width: `${(value / max) * 100}%` }} />
      </span>
      {value.toLocaleString()}
    </span>
  );
}
