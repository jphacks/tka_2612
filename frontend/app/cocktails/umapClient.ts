import type { Vec2 } from "./types";

export type UmapRequest = { requestId: number; vectors: number[][] };
export type UmapResponse =
  | { requestId: number; positions: Vec2[] }
  | { requestId: number; error: string };

export type UmapClient = {
  // 高次元ベクトルを UMAP で2次元に削減する。計算に失敗したら Error で reject する
  project(vectors: number[][]): Promise<Vec2[]>;
  dispose(): void;
};

type Pending = {
  resolve: (positions: Vec2[]) => void;
  reject: (error: Error) => void;
};

// ブラウザでだけ呼ぶ（Worker はサーバー側にない）
export function createUmapClient(): UmapClient {
  const worker = new Worker(new URL("./umap.worker.ts", import.meta.url), {
    type: "module",
  });
  const pending = new Map<number, Pending>();
  let nextRequestId = 0;

  worker.onmessage = (e: MessageEvent<UmapResponse>) => {
    const request = pending.get(e.data.requestId);
    pending.delete(e.data.requestId);
    if ("error" in e.data) request?.reject(new Error(e.data.error));
    else request?.resolve(e.data.positions);
  };
  // Worker 自体が動かなくなったときは、待っている計算をすべて失敗にする（画面が止まらないように）
  worker.onerror = () => {
    for (const request of pending.values()) {
      request.reject(new Error("マップを計算できませんでした"));
    }
    pending.clear();
  };

  return {
    project(vectors) {
      const requestId = nextRequestId++;
      return new Promise((resolve, reject) => {
        pending.set(requestId, { resolve, reject });
        const request: UmapRequest = { requestId, vectors };
        worker.postMessage(request);
      });
    },
    dispose() {
      worker.terminate();
      pending.clear();
    },
  };
}
