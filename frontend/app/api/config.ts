// バックエンド API のベース URL。.env の VITE_API_BASE_URL で上書きできる
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
