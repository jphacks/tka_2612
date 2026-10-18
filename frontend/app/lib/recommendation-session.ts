import type { RecognizedMenuItem } from "./ocr";

const SESSION_KEY = "cocktail-tasukeru.recommendation-session";

export type RecommendationSession = {
  // 検索ごとの ID。おすすめの結果をこの検索のものとして保存するのに使う
  id: string;
  query: string;
  menuImage: string | null;
  menuImageName: string | null;
  recognizedMenuItems: RecognizedMenuItem[] | null;
  ocrError: string | null;
};

function isRecognizedMenuItems(
  value: unknown,
): value is RecognizedMenuItem[] | null {
  return (
    value === null ||
    (Array.isArray(value) &&
      value.every(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          "text" in item &&
          typeof item.text === "string" &&
          "x" in item &&
          (item.x === null ||
            (typeof item.x === "number" &&
              Number.isFinite(item.x) &&
              item.x >= 0 &&
              item.x <= 100)) &&
          "y" in item &&
          (item.y === null ||
            (typeof item.y === "number" &&
              Number.isFinite(item.y) &&
              item.y >= 0 &&
              item.y <= 100)),
      ))
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

export async function saveRecommendationSession(
  query: string,
  imageFile: File | null,
  recognizedMenuItems: RecognizedMenuItem[] | null,
  ocrError: string | null,
): Promise<void> {
  const session: RecommendationSession = {
    id: crypto.randomUUID(),
    query,
    menuImage: imageFile ? await fileToImageDataUrl(imageFile) : null,
    menuImageName: imageFile?.name ?? null,
    recognizedMenuItems,
    ocrError,
  };

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
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

  const recognizedMenuItems =
    "recognizedMenuItems" in value ? value.recognizedMenuItems : null;
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
    !isRecognizedMenuItems(recognizedMenuItems) ||
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
    recognizedMenuItems,
    ocrError,
  };
}
