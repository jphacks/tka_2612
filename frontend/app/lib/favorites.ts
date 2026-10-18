import {
  addFavorite,
  type Cocktail,
  listFavoriteCounts,
  listFavorites,
  removeFavorite,
} from "~/api/generated";

const DEVICE_ID_KEY = "cocktail-tasukeru.device-id";

// ブラウザごとのランダムな端末 ID。お気に入りの記録に使い、個人情報は持たない
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// この端末でお気に入りに登録したお酒（新しく登録した順）
export async function loadFavorites(): Promise<Cocktail[]> {
  const response = await listFavorites({ device_id: getDeviceId() });
  if (response.status !== 200) {
    throw new Error("お気に入りを読み込めませんでした。");
  }
  return response.data;
}

// この端末でお気に入りに登録したお酒の ID
export async function loadFavoriteIds(): Promise<string[]> {
  return (await loadFavorites()).map((cocktail) => cocktail.id);
}

// お酒のお気に入りの総数（全端末）。まだ誰も登録していなければ 0
export async function loadFavoriteCount(cocktailId: string): Promise<number> {
  const response = await listFavoriteCounts();
  if (response.status !== 200) {
    throw new Error("お気に入りの数を読み込めませんでした。");
  }
  return (
    response.data.find((item) => item.cocktail.id === cocktailId)
      ?.favorite_count ?? 0
  );
}

// お気に入りの登録・解除を切り替え、登録後の状態と総数を返す
export async function setFavorite(
  cocktailId: string,
  favorite: boolean,
): Promise<{ favorited: boolean; count: number }> {
  const deviceId = getDeviceId();
  const response = favorite
    ? await addFavorite({ device_id: deviceId, cocktail_id: cocktailId })
    : await removeFavorite(cocktailId, { device_id: deviceId });
  if (response.status !== 200) {
    throw new Error("お気に入りを保存できませんでした。");
  }
  return {
    favorited: response.data.favorited,
    count: response.data.favorite_count,
  };
}
