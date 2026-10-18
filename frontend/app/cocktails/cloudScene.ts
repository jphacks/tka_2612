import { BASE_GROUPS } from "./bases";
import type { Vec2 } from "./types";

// 点として描くのに必要なお酒の情報
export type PointInfo = { id: string; name: string; baseGroup: string };

// 関連度がないとき（検索していないとき）の大きさ
const IDLE_RELEVANCE = 0.55;
// 点の不透明度（関連度によらず一定。選択中の点だけ 1）
const POINT_ALPHA = 0.85;
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
const FOCUS_ZOOM = 4;
const FLIGHT_MS = 900;
const FADE_IN_MS = 400;
const PICK_RADIUS_PX = 12;
const CLICK_MOVE_TOLERANCE_PX = 6;
// 下部の UI と重ならないよう、表示の中心を画面の高さに対してこの割合だけ上にずらす。
// 縦長の画面（スマホ）は地図が低く、下部の UI の割合が大きいので、より上にずらす
const VIEW_SHIFT_UP = 0.12;
const PORTRAIT_VIEW_SHIFT_UP = 0.2;
// 全体表示で点群を収める、画面の高さに対する割合
const FIT_HEIGHT = 0.7;
// 下部の UI に隠れずに見える範囲（画面の高さに対する割合）
const VISIBLE_BOTTOM = 0.6;
const PORTRAIT_VISIBLE_BOTTOM = 0.45;
// 色は app.css の夜の配色（--ink・--neon・--night）に合わせる。
// 検索で最も一致した点は、ベース酒の色と紛れないよう白く光らせる
const BEST_MATCH_COLOR = "#ffffff";
const SELECTED_RING_COLOR = "#ff4f8b";
const LABEL_COLOR = "#f6eee8";
// 名前が点や線に重なっても読めるよう、背景色で縁取る
const LABEL_HALO_COLOR = "#120f22";
// 関連度がこれ以上の点と、選んだ点・最も一致した点は、ネオンのように光らせる
const GLOW_RELEVANCE = 0.6;
const LABEL_FONT =
  '12px Inter, "Noto Sans JP", ui-sans-serif, system-ui, sans-serif';
const PINNED_LABEL_FONT = `600 ${LABEL_FONT}`;

// 表示するカクテルと、UMAP で求めた2次元座標
export type Layout = {
  cocktails: PointInfo[];
  positions: Vec2[];
  // cocktails と同じ並びの関連度（0〜1）。検索していなければ null
  relevance: Float32Array | null;
};

export type CloudScene = {
  // 表示する点を入れ替え、全体が見えるように表示し直す
  setLayout(layout: Layout): void;
  setSelected(id: string | null): void;
  setBestMatch(id: string | null): void;
  // zoomIn が true なら点に近づき、false なら点が隠れているときだけ中心に移す
  flyTo(id: string, zoomIn: boolean): void;
  dispose(): void;
};

// 表示の中心（データ座標）とズーム倍率
type View = { x: number; y: number; zoom: number };

type Flight = { from: View; to: View; startedAt: number };

type Rect = { x: number; y: number; w: number; h: number };

export function createCloudScene(
  container: HTMLElement,
  onPick: (id: string | null) => void,
): CloudScene {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D を利用できません");
  canvas.style.display = "block";
  canvas.style.touchAction = "none";
  canvas.style.cursor = "grab";
  container.appendChild(canvas);

  const baseColors = new Map<string, string>(
    BASE_GROUPS.map((g) => [g.name, g.color]),
  );

  // 表示中の点
  let cocktails: PointInfo[] = [];
  let xs: number[] = [];
  let ys: number[] = [];
  let colors: string[] = [];
  let relevance: Float32Array = new Float32Array(0);
  let indexById = new Map<string, number>();
  // 関連度の低い点から描き、関連度の高い点を上に重ねる
  let drawOrder: number[] = [];
  let bounds = { minX: -1, maxX: 1, minY: -1, maxY: 1 };

  let width = 1;
  let height = 1;
  let dpr = 1;
  // 全体表示のときの、データ座標 1 あたりのピクセル数
  let fitScale = 1;
  const view: View = { x: 0, y: 0, zoom: 1 };
  let selectedId: string | null = null;
  let bestId: string | null = null;
  let hoveredIndex = -1;
  let flight: Flight | null = null;
  let fadeStartedAt = Number.NEGATIVE_INFINITY;
  let dirty = true;

  const indexOf = (id: string | null) =>
    id === null ? -1 : (indexById.get(id) ?? -1);
  const scale = () => fitScale * view.zoom;
  const isPortrait = () => height > width;
  const originY = () =>
    height * (0.5 - (isPortrait() ? PORTRAIT_VIEW_SHIFT_UP : VIEW_SHIFT_UP));
  const screenX = (i: number) => (xs[i] - view.x) * scale() + width / 2;
  const screenY = (i: number) => (ys[i] - view.y) * scale() + originY();
  const isOnScreen = (sx: number, sy: number, margin: number) =>
    sx >= -margin &&
    sx <= width + margin &&
    sy >= -margin &&
    sy <= height + margin;

  const pointRadius = (i: number) => {
    const r = relevance[i];
    const radius =
      POINT_RADIUS * (0.4 + 1.6 * r * r) * Math.sqrt(Math.max(view.zoom, 1));
    return Math.min(
      i === indexOf(selectedId) ? Math.max(radius * 1.8, 6) : radius,
      MAX_POINT_RADIUS,
    );
  };

  const updateFitScale = () => {
    const spanX = Math.max(bounds.maxX - bounds.minX, 1e-6);
    const spanY = Math.max(bounds.maxY - bounds.minY, 1e-6);
    fitScale = Math.min((width * 0.9) / spanX, (height * FIT_HEIGHT) / spanY);
  };

  const resize = () => {
    width = Math.max(container.clientWidth, 1);
    height = Math.max(container.clientHeight, 1);
    dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    updateFitScale();
    dirty = true;
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  const drawPoint = (i: number, fade: number) => {
    const sx = screenX(i);
    const sy = screenY(i);
    const radius = pointRadius(i);
    if (!isOnScreen(sx, sy, radius + 4)) return;
    const isSelected = cocktails[i].id === selectedId;
    const isBest = cocktails[i].id === bestId;
    const color = isBest ? BEST_MATCH_COLOR : colors[i];
    ctx.globalAlpha = (isSelected ? 1 : POINT_ALPHA) * fade;
    ctx.fillStyle = color;
    // ぼかしの影は描くのが重いので、目立たせたい点だけに付ける
    const glows = isSelected || isBest || relevance[i] >= GLOW_RELEVANCE;
    ctx.shadowColor = glows ? color : "transparent";
    ctx.shadowBlur = glows ? radius * 3 : 0;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();
    if (isSelected) {
      ctx.strokeStyle = SELECTED_RING_COLOR;
      ctx.shadowColor = SELECTED_RING_COLOR;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
  };

  const overlaps = (a: Rect, b: Rect) =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  // 選択中・ホバー中の点は常に、近づいたときは関連度の高い点から重ならないように名前を出す
  const drawLabels = (fade: number) => {
    const pinned = [indexOf(selectedId), hoveredIndex].filter(
      (i, k, arr) => i >= 0 && arr.indexOf(i) === k,
    );
    const others: number[] = [];
    if (view.zoom >= LABEL_ZOOM) {
      const cx = width / 2;
      const cy = originY();
      for (let i = 0; i < cocktails.length; i++) {
        if (pinned.includes(i)) continue;
        if (isOnScreen(screenX(i), screenY(i), 0)) others.push(i);
      }
      const centerDistance = (i: number) =>
        (screenX(i) - cx) ** 2 + (screenY(i) - cy) ** 2;
      others.sort(
        (a, b) =>
          relevance[b] - relevance[a] || centerDistance(a) - centerDistance(b),
      );
    }

    const zoomFade = Math.min(1, view.zoom - LABEL_ZOOM + 0.3);
    const placed: Rect[] = [];
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = LABEL_HALO_COLOR;
    ctx.fillStyle = LABEL_COLOR;
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
      const alpha = isPinned ? 1 : zoomFade * (0.35 + 0.65 * relevance[i]);
      ctx.globalAlpha = alpha * fade;
      ctx.strokeText(name, rect.x, rect.y + rect.h / 2);
      ctx.fillText(name, rect.x, rect.y + rect.h / 2);
    }
  };

  const render = (fade: number) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const selectedIndex = indexOf(selectedId);
    const bestIndex = indexOf(bestId);
    for (const i of drawOrder) {
      if (i !== selectedIndex && i !== bestIndex) drawPoint(i, fade);
    }
    if (bestIndex >= 0 && bestIndex !== selectedIndex) {
      drawPoint(bestIndex, fade);
    }
    if (selectedIndex >= 0) drawPoint(selectedIndex, fade);
    drawLabels(fade);
    ctx.globalAlpha = 1;
  };

  // 画面上でポインタに最も近い点を選ぶ
  const pickAt = (px: number, py: number): number | null => {
    let best: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < cocktails.length; i++) {
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

  let frame = 0;
  const tick = (now: number) => {
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

    const fade = Math.min(1, (now - fadeStartedAt) / FADE_IN_MS);
    if (fade < 1) dirty = true;

    if (dirty) {
      render(fade);
      dirty = false;
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return {
    setLayout(layout) {
      cocktails = layout.cocktails;
      xs = layout.positions.map((p) => p[0]);
      ys = layout.positions.map((p) => p[1]);
      colors = cocktails.map((c) => baseColors.get(c.baseGroup) ?? "#ffffff");
      relevance =
        layout.relevance ??
        new Float32Array(cocktails.length).fill(IDLE_RELEVANCE);
      indexById = new Map(cocktails.map((c, i) => [c.id, i]));
      drawOrder = cocktails
        .map((_, i) => i)
        .sort((a, b) => relevance[a] - relevance[b]);
      hoveredIndex = -1;

      bounds = {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      };
      updateFitScale();
      view.x = (bounds.minX + bounds.maxX) / 2;
      view.y = (bounds.minY + bounds.maxY) / 2;
      view.zoom = 1;
      flight = null;
      fadeStartedAt = performance.now();
      dirty = true;
    },
    setSelected(id) {
      selectedId = id;
      dirty = true;
    },
    setBestMatch(id) {
      bestId = id;
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
          sy <=
            height * (isPortrait() ? PORTRAIT_VISIBLE_BOTTOM : VISIBLE_BOTTOM);
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
