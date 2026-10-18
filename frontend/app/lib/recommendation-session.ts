import type { MenuMatch } from "./ocr";

const SESSION_KEY = "cocktail-tasukeru.recommendation-session";

export type RecommendationSession = {
  // 検索ごとの ID。おすすめの結果をこの検索のものとして保存するのに使う
  id: string;
  query: string;
  // メニューの写真（長辺 1440px に縮小した JPEG の data URL）
  menuImage: string | null;
  menuImageName: string | null;
  // 写真から読み取ったメニューを照合した結果（写真なし・読み取り失敗なら null）
  menuMatch: MenuMatch | null;
  ocrError: string | null;
};

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isMenuMatch(value: unknown): value is MenuMatch | null {
  if (value === null) return true;
  return (
    typeof value === "object" &&
    "matched" in value &&
    Array.isArray(value.matched) &&
    value.matched.every(
      (item: unknown) =>
        typeof item === "object" &&
        item !== null &&
        "cocktailId" in item &&
        typeof item.cocktailId === "string" &&
        "text" in item &&
        typeof item.text === "string",
    ) &&
    "unregistered" in value &&
    isStringArray(value.unregistered)
  );
}

function fileToImageDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("画像を読み込めませんでした。"));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("画像データを読み込めませんでした。"));
        return;
      }

      const image = new Image();
      image.onerror = () => reject(new Error("画像を開けませんでした。"));
      image.onload = () => {
        const scale = Math.min(1, 1440 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("画像を処理できませんでした。"));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// 検索情報を保存する。isCurrent を渡すと、写真の縮小を待つあいだに新しい検索が始まっていたら
// 保存しない（古い検索で新しい検索を上書きしないため）。保存したら true を返す
export async function saveRecommendationSession(
  query: string,
  imageFile: File | null,
  menuMatch: MenuMatch | null,
  ocrError: string | null,
  isCurrent: () => boolean = () => true,
): Promise<boolean> {
  const session: RecommendationSession = {
    id: crypto.randomUUID(),
    query,
    menuImage: imageFile ? await fileToImageDataUrl(imageFile) : null,
    menuImageName: imageFile?.name ?? null,
    menuMatch,
    ocrError,
  };
  if (!isCurrent()) return false;

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return true;
}

export function loadRecommendationSession(): RecommendationSession | null {
  const serialized = sessionStorage.getItem(SESSION_KEY);
  if (!serialized) return null;

  const value: unknown = JSON.parse(serialized);
  if (typeof value !== "object" || value === null) {
    throw new Error(
      "検索情報を読み取れませんでした。もう一度検索してください。",
    );
  }

  const menuMatch = "menuMatch" in value ? value.menuMatch : null;
  const ocrError = "ocrError" in value ? value.ocrError : null;

  if (
    !("id" in value) ||
    typeof value.id !== "string" ||
    !("query" in value) ||
    typeof value.query !== "string" ||
    !("menuImage" in value) ||
    (typeof value.menuImage !== "string" && value.menuImage !== null) ||
    !("menuImageName" in value) ||
    (typeof value.menuImageName !== "string" && value.menuImageName !== null) ||
    !isMenuMatch(menuMatch) ||
    (ocrError !== null && typeof ocrError !== "string")
  ) {
    throw new Error(
      "検索情報を読み取れませんでした。もう一度検索してください。",
    );
  }

  return {
    id: value.id,
    query: value.query,
    menuImage: value.menuImage,
    menuImageName: value.menuImageName,
    menuMatch,
    ocrError,
  };
}
