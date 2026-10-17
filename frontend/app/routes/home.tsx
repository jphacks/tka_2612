import { redirect } from "react-router";

// トップページはまだないので、カクテル探索ページへ案内する
export function loader() {
  return redirect("/cocktail_points");
}
