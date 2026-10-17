import { data } from "react-router";
import type { Route } from "./+types/feedback";
import { sendFeedback } from "~/api/backend.server";

// 画面を持たない、フィードバック受け取り専用のルート
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const cocktailId = String(formData.get("cocktailId") ?? "");
  const deviceId = String(formData.get("deviceId") ?? "");
  const vote = formData.get("vote");
  if (!cocktailId || (vote !== "up" && vote !== "down")) {
    throw data("不正なフィードバックです", { status: 400 });
  }

  await sendFeedback({ cocktailId, vote, deviceId });
  return { vote };
}
