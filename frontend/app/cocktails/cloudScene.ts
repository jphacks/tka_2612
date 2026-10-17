import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { BASES } from "./mock";
import type { Cocktail } from "./types";

// 検索していないときの関連度（全点を中くらいの濃さで表示する）
const IDLE_RELEVANCE = 0.55;
// カメラからこの距離以内の点に名前を表示する
const LABEL_DISTANCE = 5;
const MAX_LABELS = 16;
// 検索結果に近づいたときの、点とカメラの距離
const FOCUS_DISTANCE = 3;
const FLIGHT_MS = 1400;
const PICK_RADIUS_PX = 12;
const CLICK_MOVE_TOLERANCE_PX = 6;

const vertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute float aRelevance;
  attribute float aIndex;
  uniform float uSize;
  uniform float uViewportHeight;
  uniform float uPixelRatio;
  uniform float uSelected;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSelected;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float selected = step(abs(aIndex - uSelected), 0.5);
    // 関連度が高い点ほど大きくする（二乗で上位の点を強調する）
    float worldSize = uSize * (0.4 + 1.6 * aRelevance * aRelevance) * (1.0 + selected * 0.8);
    float pixelSize = worldSize * projectionMatrix[1][1] * uViewportHeight * 0.5 / -mvPosition.z;
    float minSize = mix(1.5, 14.0, selected) * uPixelRatio;
    gl_PointSize = clamp(pixelSize, minSize, 72.0 * uPixelRatio);

    vColor = aColor;
    vAlpha = max(mix(0.04, 0.95, pow(aRelevance, 1.6)), selected);
    vSelected = selected;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSelected;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float shape = smoothstep(0.5, 0.15, d);
    vec3 color = vColor;
    if (vSelected > 0.5) {
      float ring = smoothstep(0.5, 0.44, d) * smoothstep(0.3, 0.38, d);
      color = mix(color, vec3(1.0), ring);
      shape = max(shape, ring);
    }
    gl_FragColor = vec4(color, vAlpha * shape);
    #include <colorspace_fragment>
  }
`;

export type CloudScene = {
  setRelevance(relevance: Float32Array | null): void;
  setSelected(id: number | null): void;
  flyTo(id: number): void;
  dispose(): void;
};

type Flight = {
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  startedAt: number;
};

export function createCloudScene(
  container: HTMLElement,
  labelLayer: HTMLElement,
  cocktails: Cocktail[],
  onPick: (id: number | null) => void,
): CloudScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.style.display = "block";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 200);
  camera.position.set(0, 4, 24);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.4;
  controls.minDistance = 0.5;
  controls.maxDistance = 60;

  const count = cocktails.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const indices = new Float32Array(count);
  const currentRelevance = new Float32Array(count).fill(IDLE_RELEVANCE);
  const targetRelevance = new Float32Array(count).fill(IDLE_RELEVANCE);
  const baseColors = new Map<string, string>(
    BASES.map((b) => [b.name, b.color]),
  );
  const color = new THREE.Color();
  cocktails.forEach((c, i) => {
    positions.set(c.vector, i * 3);
    color.set(baseColors.get(c.base) ?? "#ffffff");
    colors.set([color.r, color.g, color.b], i * 3);
    indices[i] = i;
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aIndex", new THREE.BufferAttribute(indices, 1));
  const relevanceAttribute = new THREE.BufferAttribute(currentRelevance, 1);
  relevanceAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("aRelevance", relevanceAttribute);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uSize: { value: 0.22 },
      uViewportHeight: { value: 1 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uSelected: { value: -1 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  });
  scene.add(new THREE.Points(geometry, material));

  const labels = Array.from({ length: MAX_LABELS + 1 }, () => {
    const el = document.createElement("div");
    el.className =
      "absolute left-0 top-0 whitespace-nowrap rounded bg-slate-950/70 px-1.5 py-0.5 text-xs text-slate-100";
    el.style.display = "none";
    labelLayer.appendChild(el);
    return el;
  });

  let width = 1;
  let height = 1;
  let selectedIndex = -1;
  let relevanceAnimating = false;
  let flight: Flight | null = null;

  const resize = () => {
    width = Math.max(container.clientWidth, 1);
    height = Math.max(container.clientHeight, 1);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    material.uniforms.uViewportHeight.value = height * renderer.getPixelRatio();
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  const projected = new THREE.Vector3();
  // 点 i をスクリーン座標に投影する。カメラの後ろや画面外なら null
  const toScreen = (i: number): { x: number; y: number } | null => {
    projected.fromArray(positions, i * 3).project(camera);
    if (projected.z < -1 || projected.z > 1) return null;
    if (Math.abs(projected.x) > 1.1 || Math.abs(projected.y) > 1.1) {
      return null;
    }
    return {
      x: ((projected.x + 1) / 2) * width,
      y: ((1 - projected.y) / 2) * height,
    };
  };

  const point = new THREE.Vector3();
  const updateLabels = () => {
    const candidates: { i: number; distance: number; x: number; y: number }[] =
      [];
    for (let i = 0; i < count; i++) {
      const distance = point
        .fromArray(positions, i * 3)
        .distanceTo(camera.position);
      if (distance > LABEL_DISTANCE && i !== selectedIndex) continue;
      const screen = toScreen(i);
      if (screen) candidates.push({ i, distance, ...screen });
    }
    // 選択中の点は常に表示し、残りはカメラに近い順に表示する
    candidates.sort((a, b) =>
      a.i === selectedIndex
        ? -1
        : b.i === selectedIndex
          ? 1
          : a.distance - b.distance,
    );

    labels.forEach((el, k) => {
      const c = candidates[k];
      if (!c) {
        el.style.display = "none";
        return;
      }
      const name = cocktails[c.i].name;
      if (el.textContent !== name) el.textContent = name;
      const isSelected = c.i === selectedIndex;
      const fade =
        1 -
        THREE.MathUtils.smoothstep(
          c.distance,
          LABEL_DISTANCE * 0.6,
          LABEL_DISTANCE,
        );
      const opacity = isSelected
        ? 1
        : fade * (0.25 + 0.75 * currentRelevance[c.i]);
      el.style.display = "block";
      el.style.opacity = opacity.toFixed(2);
      el.style.zIndex = isSelected ? "1" : "0";
      el.style.fontWeight = isSelected ? "600" : "400";
      el.style.transform = `translate(${c.x + 10}px, ${c.y}px) translateY(-50%)`;
    });
  };

  // 画面上でポインタに最も近い点を選ぶ
  const pickAt = (clientX: number, clientY: number): number | null => {
    const rect = renderer.domElement.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    let best: number | null = null;
    let bestDistance = PICK_RADIUS_PX ** 2;
    for (let i = 0; i < count; i++) {
      const screen = toScreen(i);
      if (!screen) continue;
      const d = (screen.x - px) ** 2 + (screen.y - py) ** 2;
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    }
    return best === null ? null : cocktails[best].id;
  };

  let pointerDown: { x: number; y: number } | null = null;
  const handlePointerDown = (e: PointerEvent) => {
    pointerDown = { x: e.clientX, y: e.clientY };
  };
  const handlePointerUp = (e: PointerEvent) => {
    if (!pointerDown) return;
    const moved = Math.hypot(
      e.clientX - pointerDown.x,
      e.clientY - pointerDown.y,
    );
    pointerDown = null;
    if (moved <= CLICK_MOVE_TOLERANCE_PX) onPick(pickAt(e.clientX, e.clientY));
  };
  const handlePointerMove = (e: PointerEvent) => {
    if (pointerDown || e.pointerType !== "mouse") return;
    renderer.domElement.style.cursor =
      pickAt(e.clientX, e.clientY) === null ? "grab" : "pointer";
  };
  renderer.domElement.addEventListener("pointerdown", handlePointerDown);
  renderer.domElement.addEventListener("pointerup", handlePointerUp);
  renderer.domElement.addEventListener("pointermove", handlePointerMove);

  const stopAutoMotion = () => {
    controls.autoRotate = false;
    flight = null;
  };
  controls.addEventListener("start", stopAutoMotion);

  let lastFrameAt = performance.now();
  renderer.setAnimationLoop((now: number) => {
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
      relevanceAttribute.needsUpdate = true;
    }

    if (flight) {
      const t = Math.min(1, (now - flight.startedAt) / FLIGHT_MS);
      const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      camera.position.lerpVectors(
        flight.fromPosition,
        flight.toPosition,
        eased,
      );
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, eased);
      if (t === 1) flight = null;
    }

    controls.update(dt);
    renderer.render(scene, camera);
    updateLabels();
  });

  return {
    setRelevance(relevance) {
      if (relevance) targetRelevance.set(relevance);
      else targetRelevance.fill(IDLE_RELEVANCE);
      relevanceAnimating = true;
    },
    setSelected(id) {
      selectedIndex =
        id === null ? -1 : cocktails.findIndex((c) => c.id === id);
      material.uniforms.uSelected.value = selectedIndex;
    },
    flyTo(id) {
      const index = cocktails.findIndex((c) => c.id === id);
      if (index < 0) return;
      const toTarget = new THREE.Vector3().fromArray(positions, index * 3);
      // 今の見る向きを保ったまま、点の手前まで近づく
      const direction = camera.position.clone().sub(controls.target);
      if (direction.lengthSq() < 1e-6) direction.set(0, 0, 1);
      direction.normalize();
      controls.autoRotate = false;
      flight = {
        fromPosition: camera.position.clone(),
        toPosition: toTarget.clone().addScaledVector(direction, FOCUS_DISTANCE),
        fromTarget: controls.target.clone(),
        toTarget,
        startedAt: performance.now(),
      };
    },
    dispose() {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      controls.removeEventListener("start", stopAutoMotion);
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      for (const el of labels) el.remove();
    },
  };
}
