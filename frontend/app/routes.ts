import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("cocktails", "routes/cocktails.tsx"),
  route("cocktails/:cocktailId", "routes/cocktail-detail.tsx"),
  route("cocktail_points", "routes/cocktail_points.tsx"),
  // バーの店長向けのトレンドレポート（利用者向けの画面からはリンクしない）
  route("store", "routes/store.tsx"),
] satisfies RouteConfig;
