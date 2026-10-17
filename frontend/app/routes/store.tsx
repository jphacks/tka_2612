import type { Route } from "./+types/store";
import { getStoreStats } from "~/api/backend.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "店舗向け | カクテルナビ" }];
}

export async function loader() {
  return getStoreStats();
}

export default function Store({ loaderData }: Route.ComponentProps) {
  const { cocktails, popularQueries } = loaderData;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">店舗向けダッシュボード</h1>
        <p className="text-sm text-gray-500">
          お客さまの好みとフィードバックの集計です。個人を特定できる情報は含みません。
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-bold">カクテルごとの評価</h2>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800">
            <tr>
              <th className="py-2 font-normal">カクテル</th>
              <th className="py-2 text-right font-normal">👍</th>
              <th className="py-2 text-right font-normal">👎</th>
              <th className="py-2 text-right font-normal">好評率</th>
            </tr>
          </thead>
          <tbody>
            {cocktails.map(({ cocktail, up, down }) => (
              <tr key={cocktail.id} className="border-b border-gray-100 dark:border-gray-900">
                <td className="py-2">{cocktail.name}</td>
                <td className="py-2 text-right tabular-nums">{up}</td>
                <td className="py-2 text-right tabular-nums">{down}</td>
                <td className="py-2 text-right tabular-nums">
                  {Math.round((up / (up + down)) * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">よく求められた味・気分</h2>
        <ol className="space-y-1 text-sm">
          {popularQueries.map(({ query, count }) => (
            <li key={query} className="flex justify-between border-b border-gray-100 py-2 dark:border-gray-900">
              <span>{query}</span>
              <span className="tabular-nums text-gray-500">{count}回</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
