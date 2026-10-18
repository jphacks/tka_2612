import { scanMenu } from "~/api/generated";

export type RecognizedMenuItem = {
  text: string;
  x: number | null;
  y: number | null;
};

const SCAN_ERRORS: Record<number, string> = {
  413: "画像が大きすぎます。10MB までの画像を選んでください。",
  415: "画像ファイルを選んでください。",
  503: "メニューの読み取りが混み合っています。少し待ってからもう一度お試しください。",
};

// メニューの写真を、バックエンド経由で Gemini に読み取らせる。
// API キーをブラウザに渡さないよう、Gemini は直接呼ばない。
export async function recognizeMenuImage(
  file: File,
): Promise<RecognizedMenuItem[]> {
  const response = await scanMenu({ image: file });
  if (response.status !== 200) {
    throw new Error(
      SCAN_ERRORS[response.status] ?? "メニュー画像の読み取りに失敗しました。",
    );
  }

  return response.data.items.map(({ name, x, y }) => ({ text: name, x, y }));
}
