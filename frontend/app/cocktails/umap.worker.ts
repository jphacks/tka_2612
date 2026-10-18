import { UMAP } from "umap-js";
import { mulberry32 } from "./random";
import type { UmapRequest, UmapResponse } from "./umapClient";

// UMAP は数百ミリ秒〜数秒かかるので、画面が固まらないよう Worker で計算する
self.onmessage = (e: MessageEvent<UmapRequest>) => {
  const { requestId, vectors } = e.data;
  let response: UmapResponse;
  try {
    const umap = new UMAP({
      nComponents: 2,
      // 近傍の数は点の数より少なくする（点が少ない検索結果でも計算できるように）
      nNeighbors: Math.max(1, Math.min(15, vectors.length - 1)),
      minDist: 0.1,
      // 同じ入力なら毎回同じ配置になるようにする
      random: mulberry32(2612),
    });
    response = {
      requestId,
      positions: umap.fit(vectors).map(([x, y]) => [x, y]),
    };
  } catch {
    response = { requestId, error: "マップを計算できませんでした" };
  }
  self.postMessage(response);
};
