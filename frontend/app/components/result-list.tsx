import type { RecommendResult } from "~/api/types";
import { useDeviceId } from "~/lib/device-id";
import { FeedbackButtons } from "./feedback-buttons";

export function ResultList({ result }: { result: RecommendResult }) {
  const deviceId = useDeviceId();

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">あなたへのおすすめ</h2>
        <p className="text-sm text-gray-500">
          「{result.query}」に近い順に、
          {result.source === "menu" ? "メニューの中から" : "すべてのカクテルから"}
          {result.recommendations.length}件
        </p>
      </div>

      <ol className="space-y-3">
        {result.recommendations.map(({ cocktail, score }, index) => (
          <li
            key={cocktail.id}
            className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-lg font-bold">
                <span className="mr-2 text-amber-600">{index + 1}</span>
                {cocktail.name}
                <span className="ml-2 text-sm font-normal text-gray-500">
                  {cocktail.aliases[0]}
                </span>
              </h3>
              <span className="shrink-0 text-sm font-bold text-amber-700 dark:text-amber-400">
                一致度 {Math.round(score * 100)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-1.5 rounded-full bg-amber-500"
                style={{ width: `${Math.round(score * 100)}%` }}
              />
            </div>
            <p>{cocktail.description}</p>
            <ul className="flex flex-wrap gap-1.5">
              {cocktail.ingredients.map((ingredient) => (
                <li
                  key={ingredient}
                  className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  {ingredient}
                </li>
              ))}
            </ul>
            <FeedbackButtons cocktailId={cocktail.id} deviceId={deviceId} />
          </li>
        ))}
      </ol>

      {result.unregistered.length > 0 && (
        <div className="rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-900">
          <p className="font-bold">読み取れたが未登録のお酒</p>
          <p className="mb-2 text-gray-500">
            データがないため、おすすめの対象から外しています。
          </p>
          <ul className="list-inside list-disc">
            {result.unregistered.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
