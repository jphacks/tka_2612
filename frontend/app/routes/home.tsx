import { data } from "react-router";
import type { Route } from "./+types/home";
import { recommend } from "~/api/backend.server";
import { RecommendForm } from "~/components/recommend-form";
import { ResultList } from "~/components/result-list";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "カクテルナビ" },
    { name: "description", content: "好みとメニュー写真から、あなたに合うカクテルを見つける" },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const query = String(formData.get("query") ?? "").trim();
  if (!query) {
    return data({ error: "飲みたいお酒の味や気分を入力してください" }, { status: 400 });
  }

  const menu = formData.get("menu");
  const menuImage = menu instanceof File && menu.size > 0 ? menu : null;
  return { result: await recommend(query, menuImage) };
}

export default function Home({ actionData }: Route.ComponentProps) {
  return (
    <div className="space-y-8">
      <RecommendForm error={actionData && "error" in actionData ? actionData.error : undefined} />
      {actionData && "result" in actionData && <ResultList result={actionData.result} />}
    </div>
  );
}
