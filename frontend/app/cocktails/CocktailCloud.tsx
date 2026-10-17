import { useEffect, useRef, useState } from "react";
import { type CloudScene, createCloudScene } from "./cloudScene";
import type { Cocktail } from "./types";

export type FocusRequest = { id: number; zoomIn: boolean; key: number };

type Props = {
  cocktails: Cocktail[];
  relevance: Float32Array | null;
  selectedId: number | null;
  // key を変えると同じ点にもう一度近づく
  focus: FocusRequest | null;
  onSelect: (id: number | null) => void;
};

export function CocktailCloud({
  cocktails,
  relevance,
  selectedId,
  focus,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelLayerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CloudScene | null>(null);
  const onSelectRef = useRef(onSelect);
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const container = containerRef.current;
    const labelLayer = labelLayerRef.current;
    if (!container || !labelLayer) return;
    let scene: CloudScene;
    try {
      scene = createCloudScene(container, labelLayer, cocktails, (id) =>
        onSelectRef.current(id),
      );
    } catch (e) {
      console.error(e);
      setWebglError(true);
      return;
    }
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
    if (focus) sceneRef.current?.flyTo(focus.id, focus.zoomIn);
  }, [focus]);

  return (
    // isolate: 名前タグの z-index をこの中だけで効かせ、上に重ねる UI より手前に出さない
    <div className="absolute inset-0 isolate overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      <div
        ref={labelLayerRef}
        className="pointer-events-none absolute inset-0 overflow-hidden"
      />
      {webglError && (
        <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-slate-400">
          お使いのブラウザでは3D表示（WebGL）を利用できません
        </p>
      )}
    </div>
  );
}
