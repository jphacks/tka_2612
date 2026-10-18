import { analyzeMenuImage, type MenuMatch } from "./ocr";
import { saveRecommendationSession } from "./recommendation-session";

// 読み取りと照合の結果。失敗しても例外にせず、エラーを入れて返す
type AnalyzeOutcome = { menuMatch: MenuMatch | null; error: string | null };

// 写真を選んだ時点で始めた読み取りと照合（送信時に使い回し、待ち時間を減らす）
let prepared: { file: File; promise: Promise<AnalyzeOutcome> } | null = null;

function analyze(file: File): Promise<AnalyzeOutcome> {
  return analyzeMenuImage(file).then(
    (menuMatch) => ({ menuMatch, error: null }),
    (error: unknown) => ({
      menuMatch: null,
      error:
        error instanceof Error
          ? error.message
          : "メニュー画像の文字認識に失敗しました。",
    }),
  );
}

// 写真を選んだ時点で、メニューの読み取りと照合を始めておく
export function prepareMenuScan(file: File): void {
  prepared = { file, promise: analyze(file) };
}

// 写真を外したときは、始めておいた読み取りを使わない
export function discardPreparedMenuScan(): void {
  prepared = null;
}

// ホームで始めたメニューの読み取り（OCR）の状態。
// 読み取り中に点群のページへ移っても続くよう、React の外（モジュール）で持つ。
// ページを再読み込みすると消える。previewUrl は、読み取っている写真を画面に出すための URL
export type MenuScanState =
  | { status: "idle" }
  | { status: "scanning"; query: string; previewUrl: string }
  | { status: "done"; query: string; previewUrl: string }
  | { status: "failed"; query: string; previewUrl: string; message: string };

const IDLE: MenuScanState = { status: "idle" };

let state: MenuScanState = IDLE;
// 新しい読み取りを始めたら、古い読み取りの結果は反映しない
let currentScanId = 0;
const listeners = new Set<() => void>();

function update(next: MenuScanState) {
  // 使わなくなった写真の URL は解放する
  if (state.status !== "idle" && state.previewUrl !== getPreviewUrl(next)) {
    URL.revokeObjectURL(state.previewUrl);
  }
  state = next;
  for (const listener of listeners) listener();
}

function getPreviewUrl(value: MenuScanState): string | null {
  return value.status === "idle" ? null : value.previewUrl;
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

// メニューの写真を読み取って照合し、おすすめの検索情報を保存する。終わるのを待たずに戻る
export function startMenuScan(query: string, imageFile: File): void {
  const scanId = ++currentScanId;
  const previewUrl = URL.createObjectURL(imageFile);
  update({ status: "scanning", query, previewUrl });
  // 写真を選んだ時点で始めておいた読み取りがあれば、その結果を使う
  const outcome =
    prepared?.file === imageFile ? prepared.promise : analyze(imageFile);
  prepared = null;

  (async () => {
    // 読み取れなくても、おすすめ一覧で全体から探せるよう検索情報は保存する
    const { menuMatch, error: ocrError } = await outcome;
    try {
      await saveRecommendationSession(query, imageFile, menuMatch, ocrError);
      if (scanId === currentScanId) {
        update({ status: "done", query, previewUrl });
      }
    } catch {
      if (scanId === currentScanId) {
        update({
          status: "failed",
          query,
          previewUrl,
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
