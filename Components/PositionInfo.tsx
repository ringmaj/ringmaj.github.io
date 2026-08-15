"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFrame, useThree, type RootState } from "@react-three/fiber";
import { PivotControls } from "@react-three/drei";
import { usePathname } from "next/navigation";
import { FiCheck, FiCopy, FiMove, FiX } from "react-icons/fi";
import * as THREE from "three";

const CAPTURE_INTERVAL = 0.16;
const MAX_CAPTURED_OBJECTS = 240;
const MAX_VISIBLE_OBJECTS = 120;
const GIZMO_COLORS = {
  x: "#ef4444",
  y: "#22c55e",
  z: "#3b82f6",
} as const;
const WORLD_GIZMO_POSITION = new THREE.Vector3();

type NumberTuple3 = [number, number, number];
type NumberTuple4 = [number, number, number, number];

interface TransformInfo {
  position: NumberTuple3;
  rotationRadians: NumberTuple3;
  rotationDegrees: NumberTuple3;
  quaternion: NumberTuple4;
  scale: NumberTuple3;
}

interface ObjectPositionInfo extends TransformInfo {
  path: string;
  name: string;
  type: string;
  visible: boolean;
  zoomable: boolean;
  world: TransformInfo;
}

export interface PositionInfoSnapshot {
  schema: "portfolio-position-debug/v1";
  capturedAt: string;
  route: string;
  canvas: {
    width: number;
    height: number;
    pixelRatio: number;
  };
  scene: {
    name: string;
    background: string | null;
    environment: string | null;
    directChildren: number;
    capturedObjects: number;
    truncated: boolean;
  };
  camera: TransformInfo & {
    type: string;
    fov: number | null;
    zoom: number;
    near: number;
    far: number;
  };
  controls: {
    target: NumberTuple3 | null;
  };
  objects: ObjectPositionInfo[];
}

interface PositionInfoModeContextValue {
  enabled: boolean;
  route: string;
  setEnabled: (enabled: boolean) => void;
}

interface PositionInfoDataContextValue {
  snapshot: PositionInfoSnapshot | null;
  publishSnapshot: (snapshot: PositionInfoSnapshot) => void;
}

const PositionInfoModeContext = createContext<PositionInfoModeContextValue | null>(
  null,
);
const PositionInfoDataContext = createContext<PositionInfoDataContextValue | null>(
  null,
);

function round(value: number, precision = 5) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function vectorTuple(vector: THREE.Vector3): NumberTuple3 {
  return [round(vector.x), round(vector.y), round(vector.z)];
}

function quaternionTuple(quaternion: THREE.Quaternion): NumberTuple4 {
  return [
    round(quaternion.x),
    round(quaternion.y),
    round(quaternion.z),
    round(quaternion.w),
  ];
}

function radiansTuple(euler: THREE.Euler): NumberTuple3 {
  return [round(euler.x), round(euler.y), round(euler.z)];
}

function degreesTuple(euler: THREE.Euler): NumberTuple3 {
  return [
    round(THREE.MathUtils.radToDeg(euler.x), 3),
    round(THREE.MathUtils.radToDeg(euler.y), 3),
    round(THREE.MathUtils.radToDeg(euler.z), 3),
  ];
}

function localTransform(object: THREE.Object3D): TransformInfo {
  return {
    position: vectorTuple(object.position),
    rotationRadians: radiansTuple(object.rotation),
    rotationDegrees: degreesTuple(object.rotation),
    quaternion: quaternionTuple(object.quaternion),
    scale: vectorTuple(object.scale),
  };
}

function worldTransform(object: THREE.Object3D): TransformInfo {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  object.matrixWorld.decompose(position, quaternion, scale);
  const rotation = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");

  return {
    position: vectorTuple(position),
    rotationRadians: radiansTuple(rotation),
    rotationDegrees: degreesTuple(rotation),
    quaternion: quaternionTuple(quaternion),
    scale: vectorTuple(scale),
  };
}

function sceneValueLabel(value: THREE.Scene["background"] | THREE.Texture | null) {
  if (!value) return null;
  if (value instanceof THREE.Color) return `#${value.getHexString()}`;
  if (value instanceof THREE.Texture) return value.name || value.constructor.name;
  return "unknown";
}

function objectSegment(object: THREE.Object3D) {
  const siblings = object.parent?.children ?? [];
  const name = object.name.trim();

  if (name) {
    const namedSiblings = siblings.filter(
      (sibling) => sibling.name.trim() === name,
    );
    if (namedSiblings.length > 1) {
      return `${name}[${Math.max(namedSiblings.indexOf(object), 0)}]`;
    }
    return name;
  }

  const typeIndex = siblings
    .filter((sibling) => sibling.type === object.type)
    .indexOf(object);
  return `${object.type}[${Math.max(typeIndex, 0)}]`;
}

function objectPath(object: THREE.Object3D, scene: THREE.Scene) {
  const segments: string[] = [];
  let current: THREE.Object3D | null = object;

  while (current && current !== scene) {
    segments.unshift(objectSegment(current));
    current = current.parent;
  }

  return [scene.name || "Scene", ...segments].join("/");
}

function isPositionableObject(object: THREE.Object3D, scene: THREE.Scene) {
  if (object === scene || object instanceof THREE.Camera) return false;
  if (object instanceof THREE.Light) return false;
  let ancestor: THREE.Object3D | null = object;
  while (ancestor) {
    if (ancestor.userData.positionInfoHelper) return false;
    ancestor = ancestor.parent;
  }
  if (object.type.includes("Helper") || object.type.startsWith("Line")) {
    return false;
  }

  return (
    object.parent === scene ||
    Boolean(object.name.trim()) ||
    Boolean(object.userData.zoomable) ||
    Boolean(object.userData.inspectRoot)
  );
}

function createSnapshot(
  route: string,
  state: RootState,
): PositionInfoSnapshot {
  const { camera, controls, gl, scene, size } = state;
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);

  const objects: ObjectPositionInfo[] = [];
  let positionableCount = 0;

  scene.traverse((object) => {
    if (!isPositionableObject(object, scene)) return;
    positionableCount += 1;
    if (objects.length >= MAX_CAPTURED_OBJECTS) return;

    objects.push({
      path: objectPath(object, scene),
      name: object.name.trim() || objectSegment(object),
      type: object.type,
      visible: object.visible,
      zoomable: Boolean(object.userData.zoomable || object.userData.inspectRoot),
      ...localTransform(object),
      world: worldTransform(object),
    });
  });

  const controlTarget = (controls as { target?: THREE.Vector3 } | null)?.target;
  const perspectiveCamera = camera instanceof THREE.PerspectiveCamera;
  const zoomableCamera =
    perspectiveCamera || camera instanceof THREE.OrthographicCamera;

  return {
    schema: "portfolio-position-debug/v1",
    capturedAt: new Date().toISOString(),
    route,
    canvas: {
      width: Math.round(size.width),
      height: Math.round(size.height),
      pixelRatio: round(gl.getPixelRatio(), 2),
    },
    scene: {
      name: scene.name || "Scene",
      background: sceneValueLabel(scene.background),
      environment: sceneValueLabel(scene.environment),
      directChildren: scene.children.length,
      capturedObjects: objects.length,
      truncated: positionableCount > objects.length,
    },
    camera: {
      type: camera.type,
      ...localTransform(camera),
      fov: perspectiveCamera ? round(camera.fov, 3) : null,
      zoom: zoomableCamera ? round(camera.zoom) : 1,
      near: zoomableCamera ? round(camera.near) : 0,
      far: zoomableCamera ? round(camera.far) : 0,
    },
    controls: {
      target: controlTarget ? vectorTuple(controlTarget) : null,
    },
    objects,
  };
}

function formatTuple(values: NumberTuple3, suffix = "") {
  return values.map((value) => `${value}${suffix}`).join(", ");
}

function TransformRows({ transform }: { transform: TransformInfo }) {
  return (
    <dl className="grid grid-cols-[1.1rem_1fr] gap-x-2 gap-y-1 font-mono text-[0.64rem] leading-relaxed text-black/65">
      <dt className="font-semibold text-black/35">P</dt>
      <dd>{formatTuple(transform.position)}</dd>
      <dt className="font-semibold text-black/35">R</dt>
      <dd>{formatTuple(transform.rotationDegrees, "°")}</dd>
      <dt className="font-semibold text-black/35">S</dt>
      <dd>{formatTuple(transform.scale)}</dd>
    </dl>
  );
}

function PositionInfoModal() {
  const { enabled, route, setEnabled } = usePositionInfoMode();
  const { snapshot } = usePositionInfoData();
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const statusTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEnabled(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, setEnabled]);

  useEffect(
    () => () => {
      if (statusTimer.current !== null) window.clearTimeout(statusTimer.current);
    },
    [],
  );

  const copySnapshot = useCallback(async () => {
    if (!snapshot) return;
    const exportPayload = {
      ...snapshot,
      exportedAt: new Date().toISOString(),
    };
    const text = JSON.stringify(exportPayload, null, 2);

    try {
      window.__LAST_POSITION_DEBUG_EXPORT__ = exportPayload;
      await navigator.clipboard.writeText(text);
      setCopyStatus("copied");
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
        setCopyStatus("copied");
      } catch {
        setCopyStatus("failed");
      }
    }

    if (statusTimer.current !== null) window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setCopyStatus("idle"), 1800);
  }, [snapshot]);

  if (!enabled) return null;

  return (
    <aside
      data-page-navigation-ignore
      aria-label="Scene position information"
      className="fixed right-4 top-[3.35rem] z-[100] flex max-h-[calc(100vh-4.35rem)] w-[26rem] max-w-[calc(100vw-2rem)] flex-col border border-black/15 bg-[#f8f8f8]/97 text-black shadow-2xl backdrop-blur-md max-sm:bottom-16 max-sm:right-3 max-sm:top-auto max-sm:w-auto max-sm:max-w-none max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none max-sm:backdrop-blur-none"
    >
      <header className="flex items-center gap-3 border-b border-black/10 px-4 py-3 max-sm:hidden">
        <span className="grid size-8 shrink-0 place-items-center border border-black/15 bg-white">
          <FiMove aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-orange-600">
            Position info
          </p>
          <p className="truncate font-mono text-[0.66rem] text-black/45">
            {route}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close position information"
          className="grid size-8 place-items-center border border-black/15 bg-white transition hover:border-orange-500 hover:text-orange-600"
          onClick={() => setEnabled(false)}
        >
          <FiX aria-hidden="true" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 [scrollbar-color:#a3a3a3_transparent] [scrollbar-width:thin] max-sm:hidden">
        {!snapshot ? (
          <p className="py-8 text-center text-xs text-black/45">
            Waiting for the active 3D scene…
          </p>
        ) : (
          <div className="space-y-4">
            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-black/40">
                  Camera
                </h2>
                <span className="font-mono text-[0.6rem] text-black/35">
                  {snapshot.camera.type}
                </span>
              </div>
              <div className="border border-black/10 bg-white p-3">
                <TransformRows transform={snapshot.camera} />
                <div className="mt-2 border-t border-black/8 pt-2 font-mono text-[0.62rem] text-black/55">
                  <p>
                    Target: {snapshot.controls.target
                      ? formatTuple(snapshot.controls.target)
                      : "none"}
                  </p>
                  <p>
                    Zoom {snapshot.camera.zoom} · FOV {snapshot.camera.fov ?? "ortho"}
                  </p>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-black/40">
                  Scene objects
                </h2>
                <span className="font-mono text-[0.6rem] text-black/35">
                  {snapshot.scene.capturedObjects}
                  {snapshot.scene.truncated ? "+" : ""}
                </span>
              </div>
              <div className="space-y-2">
                {snapshot.objects
                  .slice(0, MAX_VISIBLE_OBJECTS)
                  .map((object) => (
                    <details
                      key={object.path}
                      className="group border border-black/10 bg-white"
                    >
                      <summary className="cursor-pointer list-none px-3 py-2 marker:hidden">
                        <div className="flex items-center justify-between gap-3">
                          <span className="min-w-0 truncate text-[0.68rem] font-semibold">
                            {object.name}
                          </span>
                          <span className="shrink-0 font-mono text-[0.58rem] uppercase text-black/35">
                            {object.type}
                          </span>
                        </div>
                        <p className="mt-1 truncate font-mono text-[0.56rem] text-black/30">
                          {object.path}
                        </p>
                      </summary>
                      <div className="border-t border-black/8 px-3 py-2">
                        <p className="mb-1.5 text-[0.55rem] font-bold uppercase tracking-[0.16em] text-black/30">
                          Local
                        </p>
                        <TransformRows transform={object} />
                        <p className="mb-1.5 mt-3 text-[0.55rem] font-bold uppercase tracking-[0.16em] text-black/30">
                          World
                        </p>
                        <TransformRows transform={object.world} />
                      </div>
                    </details>
                  ))}
              </div>
              {snapshot.objects.length > MAX_VISIBLE_OBJECTS && (
                <p className="mt-2 text-[0.62rem] text-black/40">
                  The clipboard export includes all {snapshot.objects.length} captured
                  objects.
                </p>
              )}
            </section>
          </div>
        )}
      </div>

      <footer className="border-t border-black/10 bg-white/80 p-3 max-sm:flex max-sm:items-center max-sm:gap-1.5 max-sm:border-0 max-sm:bg-transparent max-sm:p-0">
        <p className="mb-2 text-[0.62rem] leading-relaxed text-black/45 max-sm:hidden">
          Drag colored arrows to move · drag colored arcs to rotate · drag empty
          space to orbit. Copy this state after positioning the scene.
        </p>
        <button
          type="button"
          disabled={!snapshot}
          className="flex h-9 w-full items-center justify-center gap-2 border border-black/20 bg-black text-[0.62rem] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-orange-600 disabled:cursor-default disabled:opacity-35 max-sm:h-8 max-sm:w-auto max-sm:rounded-md max-sm:px-3 max-sm:text-[0.56rem] max-sm:shadow-lg"
          onClick={copySnapshot}
        >
          {copyStatus === "copied" ? (
            <FiCheck aria-hidden="true" />
          ) : (
            <FiCopy aria-hidden="true" />
          )}
          <span className="max-sm:hidden">
            {copyStatus === "copied"
              ? "Copied positioning"
              : copyStatus === "failed"
                ? "Copy failed"
                : "Copy positioning"}
          </span>
          <span className="hidden max-sm:inline">
            {copyStatus === "copied"
              ? "Copied"
              : copyStatus === "failed"
                ? "Failed"
                : "Copy"}
          </span>
        </button>
        <button
          type="button"
          aria-label="Close position information"
          className="hidden size-8 place-items-center rounded-md border border-black/20 bg-white text-black shadow-lg transition hover:border-orange-500 hover:text-orange-600 max-sm:grid"
          onClick={() => setEnabled(false)}
        >
          <FiX aria-hidden="true" />
        </button>
      </footer>
    </aside>
  );
}

export function PositionInfoProvider({ children }: { children: ReactNode }) {
  const route = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [snapshot, setSnapshot] = useState<PositionInfoSnapshot | null>(null);
  const publishSnapshot = useCallback(
    (nextSnapshot: PositionInfoSnapshot) => setSnapshot(nextSnapshot),
    [],
  );

  useEffect(() => {
    setSnapshot(null);
  }, [route]);

  const modeValue = useMemo(
    () => ({ enabled, route, setEnabled }),
    [enabled, route],
  );
  const dataValue = useMemo(
    () => ({ snapshot, publishSnapshot }),
    [publishSnapshot, snapshot],
  );

  return (
    <PositionInfoModeContext.Provider value={modeValue}>
      <PositionInfoDataContext.Provider value={dataValue}>
        {children}
        <PositionInfoModal />
      </PositionInfoDataContext.Provider>
    </PositionInfoModeContext.Provider>
  );
}

export function usePositionInfoMode() {
  const context = useContext(PositionInfoModeContext);
  if (!context) {
    throw new Error("usePositionInfoMode must be used within PositionInfoProvider");
  }
  return context;
}

function usePositionInfoData() {
  const context = useContext(PositionInfoDataContext);
  if (!context) {
    throw new Error("usePositionInfoData must be used within PositionInfoProvider");
  }
  return context;
}

export function PositionInfoToggle() {
  const { enabled, setEnabled } = usePositionInfoMode();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      data-page-navigation-ignore
      title="Show live scene and object positioning"
      className="flex h-8 items-center gap-2 rounded-md border border-neutral-200 bg-white px-2.5 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 max-sm:h-7 max-sm:gap-1 max-sm:px-1.5"
      onClick={() => setEnabled(!enabled)}
    >
      <FiMove
        aria-hidden="true"
        className={`text-sm max-sm:text-xs ${enabled ? "text-neutral-950" : "text-neutral-500"}`}
      />
      <span className="hidden sm:inline">Position info</span>
      <span
        aria-hidden="true"
        className={`relative block h-5 w-9 shrink-0 overflow-hidden rounded-full border transition-colors max-sm:h-4 max-sm:w-7 ${
          enabled
            ? "border-neutral-900 bg-neutral-900"
            : "border-neutral-300 bg-neutral-200"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-3.5 rounded-full bg-white transition-transform max-sm:size-2.5 ${
            enabled ? "translate-x-4 max-sm:translate-x-3" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

interface EditableControls {
  enabled?: boolean;
  target?: THREE.Vector3;
  update?: () => void;
}

function isTransformHelper(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current.userData.positionInfoHelper) return true;
    current = current.parent;
  }
  return false;
}

function findPrimaryTransformTarget(
  scene: THREE.Scene,
  orbitTarget?: THREE.Vector3,
) {
  const center = new THREE.Vector3();
  const box = new THREE.Box3();
  let best: { object: THREE.Object3D; score: number } | null = null;

  for (const object of scene.children) {
    if (
      object instanceof THREE.Camera ||
      object instanceof THREE.Light ||
      isTransformHelper(object) ||
      !object.visible
    ) {
      continue;
    }

    let meshCount = 0;
    let explicitlyInspectable = false;
    object.traverse((child) => {
      if (!child.visible || isTransformHelper(child)) return;
      if (child instanceof THREE.Mesh) meshCount += 1;
      if (child.userData.zoomable || child.userData.inspectRoot) {
        explicitlyInspectable = true;
      }
    });
    if (meshCount === 0) continue;

    box.setFromObject(object, true);
    if (box.isEmpty()) continue;
    box.getCenter(center);

    const label = `${object.name} ${object.type}`.toLowerCase();
    const distance = orbitTarget ? center.distanceTo(orbitTarget) : 0;
    let score = Math.min(meshCount, 80) * 3 - Math.min(distance, 100) * 2;
    if (explicitlyInspectable) score += 250;
    if (object instanceof THREE.Group) score += 20;
    if (/model|root|scene/.test(label)) score += 18;
    if (/ground|floor|shadow|helper|grid|environment|background/.test(label)) {
      score -= 180;
    }

    if (!best || score > best.score) best = { object, score };
  }

  return best?.object ?? null;
}

function applyWorldTransform(
  object: THREE.Object3D,
  worldMatrix: THREE.Matrix4,
  localMatrix: THREE.Matrix4,
  parentWorldInverse: THREE.Matrix4,
) {
  localMatrix.copy(worldMatrix);
  if (object.parent) {
    object.parent.updateWorldMatrix(true, false);
    parentWorldInverse.copy(object.parent.matrixWorld).invert();
    localMatrix.premultiply(parentWorldInverse);
  }

  localMatrix.decompose(object.position, object.quaternion, object.scale);
  object.matrix.copy(localMatrix);
  object.matrixWorldNeedsUpdate = true;
  object.updateWorldMatrix(false, true);
}

function copyWorldAlignedGizmoMatrix(
  object: THREE.Object3D,
  matrix: THREE.Matrix4,
) {
  object.updateWorldMatrix(true, true);
  matrix.identity().setPosition(
    WORLD_GIZMO_POSITION.setFromMatrixPosition(object.matrixWorld),
  );
}

export function ScenePositionProbe() {
  const { enabled, route } = usePositionInfoMode();
  const { publishSnapshot } = usePositionInfoData();
  const scene = useThree((state) => state.scene);
  const isMobile = useThree((state) => state.size.width <= 640);
  const get = useThree((state) => state.get);
  const invalidate = useThree((state) => state.invalidate);
  const lastCapture = useRef(-Infinity);
  const pivotMatrix = useRef(new THREE.Matrix4());
  const objectDragStart = useRef(new THREE.Matrix4());
  const desiredWorldMatrix = useRef(new THREE.Matrix4());
  const localMatrix = useRef(new THREE.Matrix4());
  const parentWorldInverse = useRef(new THREE.Matrix4());
  const dragging = useRef(false);
  const hasTransformOverride = useRef(false);
  const controlsWereEnabled = useRef<boolean | undefined>(undefined);
  const [transformTarget, setTransformTarget] =
    useState<THREE.Object3D | null>(null);

  const capture = useCallback(() => {
    if (!enabled) return;
    publishSnapshot(createSnapshot(route, get()));
  }, [enabled, get, publishSnapshot, route]);

  useEffect(() => {
    if (!enabled) {
      const controls = get().controls as EditableControls | null;
      if (controls && controlsWereEnabled.current !== undefined) {
        controls.enabled = controlsWereEnabled.current;
        controls.update?.();
        controlsWereEnabled.current = undefined;
      }
      setTransformTarget(null);
      dragging.current = false;
      hasTransformOverride.current = false;
      return;
    }

    const controls = get().controls as EditableControls | null;
    const target = findPrimaryTransformTarget(scene, controls?.target);
    if (target) {
      copyWorldAlignedGizmoMatrix(target, pivotMatrix.current);
      target.updateWorldMatrix(true, true);
      desiredWorldMatrix.current.copy(target.matrixWorld);
    }
    setTransformTarget(target);
    lastCapture.current = -Infinity;
    capture();
    invalidate();
  }, [capture, enabled, get, invalidate, route, scene]);

  useEffect(
    () => () => {
      const controls = get().controls as EditableControls | null;
      if (controls && controlsWereEnabled.current !== undefined) {
        controls.enabled = controlsWereEnabled.current;
        controlsWereEnabled.current = undefined;
      }
    },
    [get],
  );

  const handleDragStart = useCallback(() => {
    if (!transformTarget) return;
    transformTarget.updateWorldMatrix(true, true);
    objectDragStart.current.copy(transformTarget.matrixWorld);
    desiredWorldMatrix.current.copy(transformTarget.matrixWorld);
    copyWorldAlignedGizmoMatrix(transformTarget, pivotMatrix.current);
    dragging.current = true;

    const controls = get().controls as EditableControls | null;
    if (controls) {
      controlsWereEnabled.current = controls.enabled ?? true;
      controls.enabled = false;
    }
  }, [get, transformTarget]);

  const handleDrag = useCallback(
    (
      _local: THREE.Matrix4,
      _deltaLocal: THREE.Matrix4,
      _world: THREE.Matrix4,
      deltaWorld: THREE.Matrix4,
    ) => {
      if (!transformTarget) return;
      desiredWorldMatrix.current
        .copy(objectDragStart.current)
        .premultiply(deltaWorld);
      hasTransformOverride.current = true;
      applyWorldTransform(
        transformTarget,
        desiredWorldMatrix.current,
        localMatrix.current,
        parentWorldInverse.current,
      );
      copyWorldAlignedGizmoMatrix(transformTarget, pivotMatrix.current);
      capture();
      invalidate();
    },
    [capture, invalidate, transformTarget],
  );

  const handleDragEnd = useCallback(() => {
    dragging.current = false;
    const controls = get().controls as EditableControls | null;
    if (controls && controlsWereEnabled.current !== undefined) {
      controls.enabled = controlsWereEnabled.current;
      controls.update?.();
    }
    controlsWereEnabled.current = undefined;
    capture();
    invalidate();
  }, [capture, get, invalidate]);

  useFrame(({ clock }) => {
    if (!enabled) return;
    if (transformTarget) {
      if (hasTransformOverride.current) {
        applyWorldTransform(
          transformTarget,
          desiredWorldMatrix.current,
          localMatrix.current,
          parentWorldInverse.current,
        );
        copyWorldAlignedGizmoMatrix(transformTarget, pivotMatrix.current);
      } else if (!dragging.current) {
        copyWorldAlignedGizmoMatrix(transformTarget, pivotMatrix.current);
      }
    }

    const elapsed = clock.getElapsedTime();
    if (elapsed - lastCapture.current < (isMobile ? 0.3 : CAPTURE_INTERVAL)) return;
    lastCapture.current = elapsed;
    capture();
  });

  if (!enabled || !transformTarget) return null;

  return (
    <group userData={{ positionInfoHelper: true }}>
      <PivotControls
        matrix={pivotMatrix.current}
        autoTransform={false}
        activeAxes={[true, true, true]}
        axisColors={[GIZMO_COLORS.x, GIZMO_COLORS.y, GIZMO_COLORS.z]}
        hoveredColor="#f97316"
        fixed
        scale={isMobile ? 46 : 82}
        lineWidth={isMobile ? 2 : 3}
        opacity={0.95}
        depthTest={false}
        renderOrder={1000}
        disableScaling
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        userData={{ positionInfoHelper: true }}
      />
    </group>
  );
}

declare global {
  interface Window {
    __LAST_POSITION_DEBUG_EXPORT__?: unknown;
  }
}
