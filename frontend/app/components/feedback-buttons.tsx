import { useFetcher } from "react-router";
import type { Vote } from "~/api/types";

export function FeedbackButtons({
  cocktailId,
  deviceId,
}: {
  cocktailId: string;
  deviceId: string;
}) {
  const fetcher = useFetcher();
  // 送信中から結果を表示して、押した感触をすぐ返す
  const voted = (fetcher.formData?.get("vote") as Vote | undefined) ?? fetcher.data?.vote;

  if (voted) {
    return (
      <p className="text-sm text-gray-500">
        {voted === "up" ? "👍" : "👎"} フィードバックありがとうございます
      </p>
    );
  }

  return (
    <fetcher.Form method="post" action="/feedback" className="flex items-center gap-2">
      <input type="hidden" name="cocktailId" value={cocktailId} />
      <input type="hidden" name="deviceId" value={deviceId} />
      <span className="text-sm text-gray-500">この提案はどうでしたか？</span>
      <button
        name="vote"
        value="up"
        aria-label="よかった"
        className="rounded-full border border-gray-300 px-3 py-1 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        👍
      </button>
      <button
        name="vote"
        value="down"
        aria-label="いまいち"
        className="rounded-full border border-gray-300 px-3 py-1 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        👎
      </button>
    </fetcher.Form>
  );
}
