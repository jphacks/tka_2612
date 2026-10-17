import { useEffect, useRef } from "react";
import { type CloudScene, createCloudScene, type Layout } from "./cloudScene";

export type FocusRequest = { id: string; zoomIn: boolean; key: number };

type Props = {
  // null のあいだは何も描かない（UMAP の計算中など）
  layout: Layout | null;
  selectedId: string | null;
  // 検索で最も一致したカクテル。この点だけ色を変える
  bestMatchId: string | null;
  // key を変えると同じ点にもう一度近づく
  focus: FocusRequest | null;
  onSelect: (id: string | null) => void;
};

export function CocktailCloud({
  layout,
  selectedId,
  bestMatchId,
  focus,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CloudScene | null>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const scene = createCloudScene(container, (id) => onSelectRef.current(id));
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // 以下の effect は宣言順に実行されるので、点を入れ替えてから選択・移動が反映される
  useEffect(() => {
    if (layout) sceneRef.current?.setLayout(layout);
  }, [layout]);

  useEffect(() => {
    sceneRef.current?.setSelected(selectedId);
  }, [selectedId]);

  useEffect(() => {
    sceneRef.current?.setBestMatch(bestMatchId);
  }, [bestMatchId]);

  useEffect(() => {
    if (focus) sceneRef.current?.flyTo(focus.id, focus.zoomIn);
  }, [focus]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden" />
  );
}
