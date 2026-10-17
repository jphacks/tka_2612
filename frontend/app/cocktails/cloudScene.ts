import { BASES } from "./mock";
import type { Cocktail } from "./types";

// 検索していないときの関連度（全点を中くらいの濃さで表示する）
const IDLE_RELEVANCE = 0.55;
// 全体表示のときの点の半径（px）
const POINT_RADIUS = 2.5;
const MAX_POINT_RADIUS = 18;
// ズーム倍率は全体表示を 1 とする
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 40;
// この倍率以上に近づくと名前を表示する
const LABEL_ZOOM = 2.5;
const MAX_LABELS = 14;
// 検索結果に近づくときの倍率
const FOCUS_ZOOM = 6;
const FLIGHT_MS = 900;
const PICK_RADIUS_PX = 12;
const CLICK_MOVE_TOLERANCE_PX = 6;
// 下部の UI と重ならないよう、表示の中心を画面の高さに対してこの割合だけ上にずらす
const VIEW_SHIFT_UP = 0.12;
// 全体表示で点群を収める、画面の高さに対する割合
const FIT_HEIGHT = 0.7;
// 下部の UI に隠れずに見える範囲（画面の高さに対する割合）
const VISIBLE_BOTTOM = 0.6;
// 検索で最も一致した点の色。ベース酒の色と紛れないものにする
const BEST_MATCH_COLOR = "#00ffa3";
const LABEL_FONT = "12px Inter, ui-sans-serif, system-ui, sans-serif";
const PINNED_LABEL_FONT = `600 ${LABEL_FONT}`;

export type CloudScene = {
  setRelevance(relevance: Float32Array | null): void;
  setSelected(id: number | null): void;
  setBestMatch(id: number | null): void;
  // zoomIn が true なら点に近づき、false なら点が隠れているときだけ中心に移す
  flyTo(id: number, zoomIn: boolean): void;
  dispose(): void;
};

// 表示の中心（データ座標）とズーム倍率
type View = { x: number; y: number; zoom: number };

type Flight = { from: View; to: View; startedAt: number };

type Rect = { x: number; y: number; w: number; h: number };

export function createCloudScene(
  container: HTMLElement,
  cocktails: Cocktail[],
  onPick: (id: number | null) => void,
): CloudScene {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D を利用できません");
  canvas.style.display = "block";
  canvas.style.touchAction = "none";
  canvas.style.cursor = "grab";
  container.appendChild(canvas);

  const count = cocktails.length;
  const xs = cocktails.map((c) => c.vector[0]);
  const ys = cocktails.map((c) => c.vector[1]);
  const baseColors = new Map<string, string>(
    BASES.map((b) => [b.name, b.color]),
  );
  const colors = cocktails.map((c) => baseColors.get(c.base) ?? "#ffffff");
  const currentRelevance = new Float32Array(count).fill(IDLE_RELEVANCE);
  const targetRelevance = new Float32Array(count).fill(IDLE_RELEVANCE);
  // 関連度の低い点から描き、関連度の高い点を上に重ねる
  let drawOrder = cocktails.map((_, i) => i);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);

  let width = 1;
  let height = 1;
  let dpr = 1;
  // 全体表示のときの、データ座標 1 あたりのピクセル数
  let fitScale = 1;
  const view: View = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    zoom: 1,
  };
  let selectedIndex = -1;
  let bestIndex = -1;
  let hoveredIndex = -1;
  let relevanceAnimating = false;
  let flight: Flight | null = null;
  let dirty = true;

  const scale = () => fitScale * view.zoom;
  const originY = () => height * (0.5 - VIEW_SHIFT_UP);
  const screenX = (i: number) => (xs[i] - view.x) * scale() + width / 2;
  const screenY = (i: number) => (ys[i] - view.y) * scale() + originY();
  const isOnScreen = (sx: number, sy: number, margin: number) =>
    sx >= -margin &&
    sx <= width + margin &&
    sy >= -margin &&
    sy <= height + margin;

  const pointRadius = (i: number) => {
    const r = currentRelevance[i];
    const radius =
      POINT_RADIUS * (0.4 + 1.6 * r * r) * Math.sqrt(Math.max(view.zoom, 1));
    return Math.min(
      i === selectedIndex ? Math.max(radius * 1.8, 6) : radius,
      MAX_POINT_RADIUS,
    );
  };

  const resize = () => {
    width = Math.max(container.clientWidth, 1);
    height = Math.max(container.clientHeight, 1);
    dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    fitScale = Math.min((width * 0.9) / spanX, (height * FIT_HEIGHT) / spanY);
    dirty = true;
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  const drawPoint = (i: number) => {
    const sx = screenX(i);
    const sy = screenY(i);
    const radius = pointRadius(i);
    if (!isOnScreen(sx, sy, radius + 4)) return;
    const r = currentRelevance[i];
    const isSelected = i === selectedIndex;
    ctx.globalAlpha = isSelected ? 1 : 0.04 + 0.91 * r ** 1.6;
    ctx.fillStyle = i === bestIndex ? BEST_MATCH_COLOR : colors[i];
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();
    if (isSelected) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  const overlaps = (a: Rect, b: Rect) =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  // 選択中・ホバー中の点は常に、近づいたときは関連度の高い点から重ならないように名前を出す
  const drawLabels = () => {
    const pinned = [selectedIndex, hoveredIndex].filter(
      (i, k, arr) => i >= 0 && arr.indexOf(i) === k,
    );
    const others: number[] = [];
    if (view.zoom >= LABEL_ZOOM) {
      const cx = width / 2;
      const cy = originY();
      for (let i = 0; i < count; i++) {
        if (pinned.includes(i)) continue;
        if (isOnScreen(screenX(i), screenY(i), 0)) others.push(i);
      }
      const centerDistance = (i: number) =>
        (screenX(i) - cx) ** 2 + (screenY(i) - cy) ** 2;
      others.sort(
        (a, b) =>
          currentRelevance[b] - currentRelevance[a] ||
          centerDistance(a) - centerDistance(b),
      );
    }

    const fadeIn = Math.min(1, view.zoom - LABEL_ZOOM + 0.3);
    const placed: Rect[] = [];
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgb(0 0 0 / 0.9)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
    for (const i of [...pinned, ...others.slice(0, 200)]) {
      if (placed.length >= MAX_LABELS + pinned.length) break;
      const isPinned = pinned.includes(i);
      ctx.font = isPinned ? PINNED_LABEL_FONT : LABEL_FONT;
      const name = cocktails[i].name;
      const rect: Rect = {
        x: screenX(i) + pointRadius(i) + 6,
        y: screenY(i) - 9,
        w: ctx.measureText(name).width,
        h: 18,
      };
      if (!isPinned && placed.some((p) => overlaps(p, rect))) continue;
      placed.push(rect);
      ctx.globalAlpha = isPinned
        ? 1
        : fadeIn * (0.35 + 0.65 * currentRelevance[i]);
      ctx.fillStyle = "#f1f5f9";
      ctx.fillText(name, rect.x, rect.y + rect.h / 2);
    }
    ctx.shadowColor = "transparent";
  };

  const render = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (const i of drawOrder) {
      if (i !== selectedIndex && i !== bestIndex) drawPoint(i);
    }
    if (bestIndex >= 0 && bestIndex !== selectedIndex) drawPoint(bestIndex);
    if (selectedIndex >= 0) drawPoint(selectedIndex);
    drawLabels();
    ctx.globalAlpha = 1;
  };

  // 画面上でポインタに最も近い点を選ぶ
  const pickAt = (px: number, py: number): number | null => {
    let best: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < count; i++) {
      const d = (screenX(i) - px) ** 2 + (screenY(i) - py) ** 2;
      const reach = Math.max(PICK_RADIUS_PX, pointRadius(i) + 4);
      if (d <= reach ** 2 && d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    }
    return best;
  };

  // 画面上の (sx, sy) にあるデータ座標を動かさずに拡大・縮小する
  const zoomAt = (sx: number, sy: number, factor: number) => {
    const wx = view.x + (sx - width / 2) / scale();
    const wy = view.y + (sy - originY()) / scale();
    view.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom * factor));
    view.x = wx - (sx - width / 2) / scale();
    view.y = wy - (sy - originY()) / scale();
    dirty = true;
  };

  const localPoint = (e: PointerEvent | WheelEvent) => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // 押している指・マウスの現在位置
  const pointers = new Map<number, { x: number; y: number }>();
  let pressStart: { x: number; y: number } | null = null;
  let moved = false;

  const pinchState = () => {
    const [a, b] = [...pointers.values()];
    return {
      distance: Math.hypot(a.x - b.x, a.y - b.y),
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  };

  const handlePointerDown = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId);
    const p = localPoint(e);
    pointers.set(e.pointerId, p);
    flight = null;
    if (pointers.size === 1) {
      pressStart = p;
      moved = false;
      canvas.style.cursor = "grabbing";
    } else {
      moved = true;
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    const p = localPoint(e);
    const prev = pointers.get(e.pointerId);
    if (!prev) {
      // マウスを乗せた点の名前を出し、クリックできることをカーソルで示す
      if (e.pointerType !== "mouse") return;
      const hovered = pickAt(p.x, p.y) ?? -1;
      if (hovered !== hoveredIndex) {
        hoveredIndex = hovered;
        dirty = true;
      }
      canvas.style.cursor = hoveredIndex < 0 ? "grab" : "pointer";
      return;
    }

    if (pointers.size === 2) {
      const before = pinchState();
      pointers.set(e.pointerId, p);
      const after = pinchState();
      view.x -= (after.mid.x - before.mid.x) / scale();
      view.y -= (after.mid.y - before.mid.y) / scale();
      if (before.distance > 0) {
        zoomAt(after.mid.x, after.mid.y, after.distance / before.distance);
      }
    } else {
      pointers.set(e.pointerId, p);
      view.x -= (p.x - prev.x) / scale();
      view.y -= (p.y - prev.y) / scale();
      if (
        pressStart &&
        Math.hypot(p.x - pressStart.x, p.y - pressStart.y) >
          CLICK_MOVE_TOLERANCE_PX
      ) {
        moved = true;
      }
    }
    dirty = true;
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (!pointers.delete(e.pointerId)) return;
    if (pointers.size > 0) return;
    canvas.style.cursor = "grab";
    if (!moved && e.type === "pointerup") {
      const p = localPoint(e);
      const picked = pickAt(p.x, p.y);
      onPick(picked === null ? null : cocktails[picked].id);
    }
  };

  const handlePointerLeave = () => {
    if (hoveredIndex < 0) return;
    hoveredIndex = -1;
    dirty = true;
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    flight = null;
    const p = localPoint(e);
    zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.002));
  };

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener("pointerleave", handlePointerLeave);
  canvas.addEventListener("wheel", handleWheel, { passive: false });

  let lastFrameAt = performance.now();
  let frame = 0;
  const tick = (now: number) => {
    const dt = (now - lastFrameAt) / 1000;
    lastFrameAt = now;

    if (relevanceAnimating) {
      const k = Math.min(1, dt * 6);
      let maxDiff = 0;
      for (let i = 0; i < count; i++) {
        const diff = targetRelevance[i] - currentRelevance[i];
        currentRelevance[i] += diff * k;
        maxDiff = Math.max(maxDiff, Math.abs(diff));
      }
      if (maxDiff < 0.001) {
        currentRelevance.set(targetRelevance);
        relevanceAnimating = false;
      }
      dirty = true;
    }

    if (flight) {
      const t = Math.min(1, (now - flight.startedAt) / FLIGHT_MS);
      const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      const { from, to } = flight;
      view.x = from.x + (to.x - from.x) * eased;
      view.y = from.y + (to.y - from.y) * eased;
      // 倍率は比率で補間すると拡大の速さが一定に見える
      view.zoom = from.zoom * (to.zoom / from.zoom) ** eased;
      if (t === 1) flight = null;
      dirty = true;
    }

    if (dirty) {
      render();
      dirty = false;
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  const indexOf = (id: number | null) =>
    id === null ? -1 : cocktails.findIndex((c) => c.id === id);

  return {
    setRelevance(relevance) {
      if (relevance) targetRelevance.set(relevance);
      else targetRelevance.fill(IDLE_RELEVANCE);
      drawOrder = cocktails
        .map((_, i) => i)
        .sort((a, b) => targetRelevance[a] - targetRelevance[b]);
      relevanceAnimating = true;
    },
    setSelected(id) {
      selectedIndex = indexOf(id);
      dirty = true;
    },
    setBestMatch(id) {
      bestIndex = indexOf(id);
      dirty = true;
    },
    flyTo(id, zoomIn) {
      const index = indexOf(id);
      if (index < 0) return;
      if (!zoomIn) {
        const sx = screenX(index);
        const sy = screenY(index);
        const margin = 40;
        const visible =
          sx >= margin &&
          sx <= width - margin &&
          sy >= margin &&
          sy <= height * VISIBLE_BOTTOM;
        if (visible) return;
      }
      flight = {
        from: { ...view },
        to: {
          x: xs[index],
          y: ys[index],
          zoom: zoomIn ? Math.max(view.zoom, FOCUS_ZOOM) : view.zoom,
        },
        startedAt: performance.now(),
      };
    },
    dispose() {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.remove();
    },
  };
}
