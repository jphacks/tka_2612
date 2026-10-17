import { useEffect, useRef } from "react";
import { type CloudScene, createCloudScene } from "./cloudScene";
import type { Cocktail } from "./types";

export type FocusRequest = { id: number; zoomIn: boolean; key: number };

type Props = {
  cocktails: Cocktail[];
  relevance: Float32Array | null;
  selectedId: number | null;
  // 検索で最も一致したカクテル。この点だけ色を変える
  bestMatchId: number | null;
  // key を変えると同じ点にもう一度近づく
  focus: FocusRequest | null;
  onSelect: (id: number | null) => void;
};

export function CocktailCloud({
  cocktails,
  relevance,
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
    const scene = createCloudScene(container, cocktails, (id) =>
      onSelectRef.current(id),
    );
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [cocktails]);

  useEffect(() => {
    sceneRef.current?.setRelevance(relevance);
  }, [relevance]);

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
