import type { Vec2 } from "./types";

export type UmapRequest = { requestId: number; vectors: number[][] };
export type UmapResponse = { requestId: number; positions: Vec2[] };

export type UmapClient = {
  // 高次元ベクトルを UMAP で2次元に削減する
  project(vectors: number[][]): Promise<Vec2[]>;
  dispose(): void;
};

// ブラウザでだけ呼ぶ（Worker はサーバー側にない）
export function createUmapClient(): UmapClient {
  const worker = new Worker(new URL("./umap.worker.ts", import.meta.url), {
    type: "module",
  });
  const pending = new Map<number, (positions: Vec2[]) => void>();
  let nextRequestId = 0;

  worker.onmessage = (e: MessageEvent<UmapResponse>) => {
    pending.get(e.data.requestId)?.(e.data.positions);
    pending.delete(e.data.requestId);
  };

  return {
    project(vectors) {
      const requestId = nextRequestId++;
      return new Promise((resolve) => {
        pending.set(requestId, resolve);
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
