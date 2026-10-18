import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FocusRequest } from "~/cocktails/CocktailCloud";
import type { Layout } from "~/cocktails/cloudScene";
import {
  type CocktailPoint,
  fetchCocktailPoints,
  searchNearby,
} from "~/cocktails/cocktailData";
import { createUmapClient, type UmapClient } from "~/cocktails/umapClient";

const COMPUTING = "マップを計算しています…";

// 全カクテルを UMAP で2次元にした配置（検索していないときに表示する）
async function projectAll(
  client: UmapClient,
  points: CocktailPoint[],
): Promise<Layout> {
  const positions = await client.project(points.map((p) => p.vector));
  return { cocktails: points, positions, relevance: null };
}

// 一致度（コサイン類似度）は差が小さいので、集めた範囲の中で広げて点の大きさに使う
function toRelevance(scores: number[]): Float32Array {
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  return Float32Array.from(scores, (s) =>
    max === min ? 1 : 0.15 + (0.85 * (s - min)) / (max - min),
  );
}

// id の点へ寄る要求。key を変えて、同じ点でももう一度寄るようにする
function focusRequest(id: string, zoomIn: boolean) {
  return (prev: FocusRequest | null): FocusRequest => ({
    id,
    zoomIn,
    key: (prev?.key ?? 0) + 1,
  });
}

function errorMessage(error: unknown): string {
  // fetch がサーバーにつながらないときは TypeError になる
  if (error instanceof TypeError) {
    return "サーバーに接続できませんでした。バックエンドが起動しているか確認してください";
  }
  return error instanceof Error ? error.message : "エラーが発生しました";
}

type MapActions = {
  search: (text: string) => Promise<boolean>;
  showAll: () => Promise<void>;
};

// カクテルの地図の状態。お酒とベクトルを読み込み、全件または検索結果を UMAP で配置する。
// initialQuery があれば、最初にその入力文で検索する
export function useCocktailMap(initialQuery: string) {
  const [points, setPoints] = useState<CocktailPoint[]>([]);
  const [layout, setLayout] = useState<Layout | null>(null);
  // 検索欄の上に出す、読み込み・計算の状況や検索結果の説明
  const [status, setStatus] = useState<string | null>(
    "お酒のデータを読み込んでいます…",
  );
  // 表示中の検索結果の一致度（検索していなければ null）
  const [scores, setScores] = useState<Map<string, number> | null>(null);
  const [bestMatchId, setBestMatchId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const actionsRef = useRef<MapActions | null>(null);
  // 最初の入力文は、読み込みのときに1回だけ使う
  const initialQueryRef = useRef(initialQuery);

  const pointsById = useMemo(
    () => new Map(points.map((p) => [p.id, p])),
    [points],
  );

  useEffect(() => {
    const client = createUmapClient();
    let disposed = false;
    let loaded: CocktailPoint[] = [];
    let byId = new Map<string, CocktailPoint>();
    // 全件の配置は一度だけ計算し、検索をクリアしたときに使い回す
    let allLayout: Promise<Layout> | null = null;
    // 古い検索や UMAP の結果で表示を上書きしないよう、最新の要求だけを反映する
    let latestRequest = 0;
    const beginRequest = () => {
      const request = ++latestRequest;
      return () => !disposed && request === latestRequest;
    };

    const computeAll = () => {
      if (!allLayout) {
        allLayout = projectAll(client, loaded);
        // 失敗したら次に表示するときに計算し直す（待っている側には失敗が伝わる）
        allLayout.catch(() => {
          allLayout = null;
        });
      }
      return allLayout;
    };

    // 全件を表示する。keepStatus なら、検索の失敗などの案内を消さずに残す
    const showAll = async (keepStatus = false) => {
      const isLatest = beginRequest();
      if (!allLayout && !keepStatus) setStatus(COMPUTING);
      try {
        const all = await computeAll();
        if (!isLatest()) return;
        setLayout(all);
        if (!keepStatus) setStatus(null);
      } catch (error) {
        if (isLatest()) setStatus(errorMessage(error));
      }
    };

    // 入力に近いカクテルだけを集め、その中で UMAP をかけ直して表示する。表示できたら true
    const search = async (text: string): Promise<boolean> => {
      const isLatest = beginRequest();
      setStatus("検索しています…");
      try {
        const hit = await searchNearby(text, byId);
        if (!isLatest()) return false;
        if (hit.cocktails.length === 0) {
          setStatus("近いカクテルが見つかりませんでした");
          return false;
        }
        setStatus(COMPUTING);
        const positions = await client.project(
          hit.cocktails.map((c) => c.vector),
        );
        if (!isLatest()) return false;
        const best = hit.cocktails[0].id;
        setLayout({
          cocktails: hit.cocktails,
          positions,
          relevance: toRelevance(hit.scores),
        });
        setScores(new Map(hit.cocktails.map((c, i) => [c.id, hit.scores[i]])));
        setStatus(`「${text}」に近い ${hit.cocktails.length} 件`);
        // 最も一致したカクテルを選択状態にして、そこに近づく
        setBestMatchId(best);
        setSelectedId(best);
        setFocus(focusRequest(best, true));
        return true;
      } catch (error) {
        if (isLatest()) setStatus(errorMessage(error));
        return false;
      }
    };

    (async () => {
      try {
        loaded = await fetchCocktailPoints();
        if (disposed) return;
        byId = new Map(loaded.map((p) => [p.id, p]));
        setPoints(loaded);
        actionsRef.current = { search, showAll: () => showAll() };

        // 入力文があれば、全件の配置より先に検索結果を出す（UMAP は1件ずつ順に計算されるため）
        const query = initialQueryRef.current;
        const found = query !== "" && (await search(query));
        if (disposed) return;
        if (found) {
          // クリアしたときにすぐ出せるよう、全件の配置も計算しておく
          computeAll();
        } else {
          // 検索しなかった・見つからなかったときは全件を表示する（失敗の案内は残す）
          await showAll(query !== "");
        }
      } catch (error) {
        if (!disposed) setStatus(errorMessage(error));
      }
    })();

    return () => {
      disposed = true;
      client.dispose();
      actionsRef.current = null;
    };
  }, []);

  // お酒を選ぶ（null で選択を外す）。選んだ点へ寄る
  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id !== null) setFocus(focusRequest(id, false));
  }, []);

  const search = useCallback(
    (text: string) =>
      actionsRef.current?.search(text) ?? Promise.resolve(false),
    [],
  );

  // 検索をやめて、全件の地図に戻す
  const clear = useCallback(() => {
    setScores(null);
    setBestMatchId(null);
    setSelectedId(null);
    return actionsRef.current?.showAll() ?? Promise.resolve();
  }, []);

  return {
    points,
    layout,
    status,
    scores,
    bestMatchId,
    selectedId,
    selected: selectedId === null ? null : (pointsById.get(selectedId) ?? null),
    focus,
    select,
    search,
    clear,
  };
}
