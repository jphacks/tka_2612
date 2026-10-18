import { type RecognizedMenuItem, recognizeMenuImage } from "./ocr";
import { saveRecommendationSession } from "./recommendation-session";

// ホームで始めたメニューの読み取り（OCR）の状態。
// 読み取り中に点群のページへ移っても続くよう、React の外（モジュール）で持つ。
// ページを再読み込みすると消える
export type MenuScanState =
  | { status: "idle" }
  | { status: "scanning"; query: string }
  | { status: "done"; query: string }
  | { status: "failed"; query: string; message: string };

const IDLE: MenuScanState = { status: "idle" };

let state: MenuScanState = IDLE;
// 新しい読み取りを始めたら、古い読み取りの結果は反映しない
let currentScanId = 0;
const listeners = new Set<() => void>();

function update(next: MenuScanState) {
  state = next;
  for (const listener of listeners) listener();
}

export function subscribeMenuScan(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getMenuScanState(): MenuScanState {
  return state;
}

// サーバーでの描画では、読み取りは行われていない
export function getServerMenuScanState(): MenuScanState {
  return IDLE;
}

// メニューの写真を読み取り、おすすめの検索情報を保存する。終わるのを待たずに戻る
export function startMenuScan(query: string, imageFile: File): void {
  const scanId = ++currentScanId;
  update({ status: "scanning", query });

  (async () => {
    let recognizedMenuItems: RecognizedMenuItem[] | null = null;
    let ocrError: string | null = null;
    try {
      recognizedMenuItems = await recognizeMenuImage(imageFile);
    } catch (error) {
      // 読み取れなくても、おすすめ一覧で全体から探せるよう検索情報は保存する
      ocrError =
        error instanceof Error
          ? error.message
          : "メニュー画像の文字認識に失敗しました。";
    }

    try {
      await saveRecommendationSession(
        query,
        imageFile,
        recognizedMenuItems,
        ocrError,
      );
      if (scanId === currentScanId) update({ status: "done", query });
    } catch {
      if (scanId === currentScanId) {
        update({
          status: "failed",
          query,
          message:
            "検索を開始できませんでした。画像を小さくするか、もう一度お試しください。",
        });
      }
    }
  })();
}

// 結果を見た・閉じたあとは、状態を消す
export function clearMenuScan(): void {
  currentScanId++;
  update(IDLE);
}
