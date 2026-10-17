import { UMAP } from "umap-js";
import { mulberry32 } from "./random";
import type { UmapRequest, UmapResponse } from "./umapClient";

// UMAP は数百ミリ秒〜数秒かかるので、画面が固まらないよう Worker で計算する
self.onmessage = (e: MessageEvent<UmapRequest>) => {
  const { requestId, vectors } = e.data;
  const umap = new UMAP({
    nComponents: 2,
    nNeighbors: Math.min(15, vectors.length - 1),
    minDist: 0.1,
    // 同じ入力なら毎回同じ配置になるようにする
    random: mulberry32(2612),
  });
  const response: UmapResponse = {
    requestId,
    positions: umap.fit(vectors).map(([x, y]) => [x, y]),
  };
  self.postMessage(response);
};
