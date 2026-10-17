import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("cocktail_points", "routes/cocktail_points.tsx"),
] satisfies RouteConfig;
