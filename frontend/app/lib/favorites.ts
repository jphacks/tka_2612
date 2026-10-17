const FAVORITES_KEY = "sip.favorite-cocktails";

export function loadFavorites(): string[] {
  const serialized = localStorage.getItem(FAVORITES_KEY);
  if (!serialized) return [];

  const value: unknown = JSON.parse(serialized);
  if (
    !Array.isArray(value) ||
    !value.every(
      (cocktailId): cocktailId is string => typeof cocktailId === "string",
    )
  ) {
    throw new Error("お気に入りの保存データを読み取れませんでした。");
  }

  return value;
}

export function saveFavorites(cocktailIds: string[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(cocktailIds));
}
