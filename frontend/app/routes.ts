import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("cocktails", "routes/cocktails.tsx"),
  route("cocktails/:cocktailId", "routes/cocktail-detail.tsx"),
  route("cocktail_points", "routes/cocktail_points.tsx"),
  route("favorites", "routes/favorites.tsx"),
  // バーの店長向けのトレンドレポート（ホームのヘッダーの「お店の方へ」から開く）
  route("store", "routes/store.tsx"),
] satisfies RouteConfig;
