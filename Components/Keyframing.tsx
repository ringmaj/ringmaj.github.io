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
import { PivotControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { usePathname } from "next/navigation";
import { FiCheck, FiClock, FiCopy, FiKey, FiLock, FiPause, FiPlay, FiPlus, FiTrash2, FiUnlock, FiX } from "react-icons/fi";
import * as THREE from "three";

type Tuple3 = [number, number, number];
type Tuple4 = [number, number, number, number];

interface KeyframePose {
  id: string;
  time: number;
  local: TransformExport;
  world: TransformExport;
}

interface TransformExport {
  position: Tuple3;
  rotationRadians: Tuple3;
  rotationDegrees: Tuple3;
  quaternion: Tuple4;
  scale: Tuple3;
}

interface KeyframingContextValue {
  enabled: boolean;
  route: string;
  setEnabled: (enabled: boolean) => void;
}

interface KeyframingDataContextValue {
  selectedObject: THREE.Object3D | null;
  selectedPath: string | null;
  selectedName: string | null;
  currentTime: number;
  keyframes: KeyframePose[];
  playing: boolean;
  selectionLocked: boolean;
  setCurrentTime: (time: number) => void;
  seek: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  setSelectionLocked: (locked: boolean) => void;
  addKeyframe: () => void;
  removeKeyframe: (id: string) => void;
  copyExport: () => Promise<boolean>;
  registerSelection: (object: THREE.Object3D | null, scene: THREE.Scene | null) => void;
  registeredObjects: Array<{ id: string; label: string }>;
  registerObject: (id: string, label: string, object: THREE.Object3D, scene: THREE.Scene) => () => void;
  selectRegistered: (id: string) => void;
  posePresets: Array<{ id: string; label: string }>;
  activePosePreset: string | null;
  registerPosePresets: (
    presets: Array<{ id: string; label: string; apply: () => void }>,
  ) => () => void;
  applyPosePreset: (id: string) => void;
}

const KeyframingContext = createContext<KeyframingContextValue | null>(null);
const KeyframingDataContext = createContext<KeyframingDataContextValue | null>(null);
const COLORS: [string, string, string] = ["#ef4444", "#22c55e", "#3b82f6"];
const WORLD_GIZMO_POSITION = new THREE.Vector3();

function round(value: number, precision = 5) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function tuple3(vector: THREE.Vector3): Tuple3 {
  return [round(vector.x), round(vector.y), round(vector.z)];
}

function tuple4(quaternion: THREE.Quaternion): Tuple4 {
  return [round(quaternion.x), round(quaternion.y), round(quaternion.z), round(quaternion.w)];
}

function transformExport(object: THREE.Object3D, world = false): TransformExport {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  if (world) {
    object.updateWorldMatrix(true, true);
    object.matrixWorld.decompose(position, quaternion, scale);
  } else {
    position.copy(object.position);
    quaternion.copy(object.quaternion);
    scale.copy(object.scale);
  }
  const rotation = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");
  return {
    position: tuple3(position),
    rotationRadians: tuple3(new THREE.Vector3(rotation.x, rotation.y, rotation.z)),
    rotationDegrees: [
      round(THREE.MathUtils.radToDeg(rotation.x), 3),
      round(THREE.MathUtils.radToDeg(rotation.y), 3),
      round(THREE.MathUtils.radToDeg(rotation.z), 3),
    ],
    quaternion: tuple4(quaternion),
    scale: tuple3(scale),
  };
}

function segment(object: THREE.Object3D) {
  if (object.name.trim()) return object.name.trim();
  const siblings = object.parent?.children ?? [];
  const index = siblings.filter((sibling) => sibling.type === object.type).indexOf(object);
  return `${object.type}[${Math.max(index, 0)}]`;
}

function pathFor(object: THREE.Object3D, scene: THREE.Scene) {
  const parts: string[] = [];
  let current: THREE.Object3D | null = object;
  while (current && current !== scene) {
    parts.unshift(segment(current));
    current = current.parent;
  }
  return [scene.name || "Scene", ...parts].join("/");
}

function applyWorldMatrix(object: THREE.Object3D, world: THREE.Matrix4) {
  const local = world.clone();
  if (object.parent) {
    object.parent.updateWorldMatrix(true, false);
    local.premultiply(object.parent.matrixWorld.clone().invert());
  }
  local.decompose(object.position, object.quaternion, object.scale);
  object.matrix.copy(local);
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

function applyInterpolatedKeyframes(object: THREE.Object3D, keyframes: KeyframePose[], time: number) {
  if (keyframes.length === 0) return;
  const frames = [...keyframes].sort((a, b) => a.time - b.time);
  let start = frames[0];
  let end = frames[frames.length - 1];
  if (time <= start.time) end = start;
  else if (time >= end.time) start = end;
  else {
    const index = frames.findIndex((frame) => frame.time >= time);
    start = frames[Math.max(0, index - 1)];
    end = frames[index];
  }
  const span = Math.max(end.time - start.time, Number.EPSILON);
  const linear = THREE.MathUtils.clamp((time - start.time) / span, 0, 1);
  const blend = linear * linear * (3 - 2 * linear);
  object.position.set(...start.local.position).lerp(new THREE.Vector3(...end.local.position), blend);
  object.scale.set(...start.local.scale).lerp(new THREE.Vector3(...end.local.scale), blend);
  object.quaternion
    .set(...start.local.quaternion)
    .slerp(new THREE.Quaternion(...end.local.quaternion), blend)
    .normalize();
  object.updateMatrix();
  object.updateWorldMatrix(false, true);
}

function isHelper(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current.userData.keyframingHelper || current.userData.positionInfoHelper) return true;
    current = current.parent;
  }
  return false;
}

function isSelectableHit(object: THREE.Object3D) {
  if (isHelper(object)) return false;
  let current: THREE.Object3D | null = object;
  while (current) {
    if (
      current.userData.keyframingIgnore ||
      /^(floor|ground|shadow|backdrop|environment)$/i.test(current.name.trim())
    ) {
      return false;
    }
    current = current.parent;
  }
  return true;
}

function selectableRoot(hit: THREE.Object3D, scene: THREE.Scene) {
  let current: THREE.Object3D | null = hit;
  let namedCandidate: THREE.Object3D | null = null;
  while (current && current !== scene) {
    // Scene authors can mark a logical object without coupling the selector
    // to model-specific mesh or material names.
    if (current.name.startsWith("keyframe_")) return current;
    if (current.userData.inspectRoot || current.userData.zoomable) return current;
    if (
      current.name.trim() &&
      !/mesh|geometry|primitive/i.test(current.name) &&
      !namedCandidate
    ) {
      namedCandidate = current;
    }
    // R3F/Rapier rigid-body groups expose this object marker. Selecting this
    // level makes board and shoes independently poseable on the skate page.
    if (current.userData.rigidBody) return current;
    current = current.parent;
  }
  if (namedCandidate && !isHelper(namedCandidate)) return namedCandidate;
  return current && current !== scene && !isHelper(current) ? current : null;
}

function KeyframingPanel() {
  const { enabled, route, setEnabled } = useKeyframingMode();
  const data = useKeyframingData();
  const [copied, setCopied] = useState(false);
  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[105] w-[28rem] max-w-[calc(100vw-2rem)]">
      {data.posePresets.length > 0 && (
        <div
          data-page-navigation-ignore
          aria-label="Trick positions"
          className="mb-2 border border-black/15 bg-[#f8f8f8]/97 p-2.5 text-black shadow-xl backdrop-blur-md"
        >
          <p className="mb-2 text-[0.55rem] font-bold uppercase tracking-[0.18em] text-black/40">
            Trick positions
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {data.posePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                aria-pressed={data.activePosePreset === preset.id}
                className={`h-8 border text-[0.57rem] font-bold uppercase tracking-[0.1em] transition-colors ${
                  data.activePosePreset === preset.id
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-black/15 bg-white text-black/55 hover:border-orange-400 hover:text-orange-600"
                }`}
                onClick={() => data.applyPosePreset(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <aside
        data-page-navigation-ignore
        aria-label="Keyframing editor"
        className="border border-black/15 bg-[#f8f8f8]/97 text-black shadow-2xl backdrop-blur-md"
      >
      <header className="flex items-center gap-3 border-b border-black/10 px-4 py-3">
        <span className="grid size-8 place-items-center border border-black/15 bg-white"><FiKey /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-orange-600">Keyframing</p>
          <p className="truncate font-mono text-[0.62rem] text-black/45">{data.selectedPath ?? `${route} · click a 3D object`}</p>
        </div>
        <button
          type="button"
          aria-label={data.selectionLocked ? "Unlock selected object" : "Lock selected object"}
          aria-pressed={data.selectionLocked}
          disabled={!data.selectedObject}
          title={data.selectionLocked ? "Unlock object selection" : "Lock object selection while editing"}
          className={`grid size-8 place-items-center border disabled:opacity-30 ${data.selectionLocked ? "border-orange-500 bg-orange-50 text-orange-600" : "border-black/15 bg-white"}`}
          onClick={() => data.setSelectionLocked(!data.selectionLocked)}
        >{data.selectionLocked ? <FiLock /> : <FiUnlock />}</button>
        <button aria-label="Close keyframing" className="grid size-8 place-items-center border border-black/15 bg-white" onClick={() => setEnabled(false)}><FiX /></button>
      </header>

      <div className="space-y-3 p-4">
        <p className="text-[0.64rem] leading-relaxed text-black/50">
          Click an object, drag the colored arrows or rotation arcs, choose a time, then add a keyframe.
        </p>
        {data.registeredObjects.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5" aria-label="Keyframe objects">
            {data.registeredObjects.map((object) => (
              <button
                key={object.id}
                type="button"
                disabled={data.selectionLocked && data.selectedName !== object.id}
                className={`h-8 border text-[0.55rem] font-bold uppercase tracking-[0.1em] ${data.selectedName === object.id ? "border-orange-500 bg-orange-50 text-orange-700" : "border-black/15 bg-white text-black/55"}`}
                onClick={() => data.selectRegistered(object.id)}
              >{object.label}</button>
            ))}
          </div>
        )}
        <label className="block">
          <span className="mb-1 flex items-center justify-between text-[0.58rem] font-bold uppercase tracking-[0.16em] text-black/40">
            <span>Timeline</span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                aria-label={data.playing ? "Pause keyframes" : "Play keyframes"}
                disabled={data.keyframes.length < 2}
                className="grid size-6 place-items-center border border-black/15 bg-white text-black disabled:opacity-30"
                onClick={(event) => {
                  event.preventDefault();
                  data.setPlaying(!data.playing);
                }}
              >{data.playing ? <FiPause /> : <FiPlay />}</button>
              <span className="font-mono">{data.currentTime.toFixed(2)}s</span>
            </span>
          </span>
          <input
            aria-label="Keyframe time"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={data.currentTime}
            onChange={(event) => data.seek(Number(event.target.value))}
            className="w-full accent-orange-600"
          />
        </label>
        <div className="flex justify-between gap-2">
          {[0, 0.25, 0.5, 0.75, 1].map((time) => (
            <button
              key={time}
              type="button"
              aria-label={`Set keyframe time to ${time.toFixed(2)} seconds`}
              className="h-6 min-w-0 flex-1 border border-black/10 bg-white font-mono text-[0.5rem] text-black/45 hover:border-orange-400 hover:text-orange-600"
              onClick={() => data.seek(time)}
            >{time.toFixed(2)}</button>
          ))}
        </div>
        <div className="relative h-8 border-y border-black/10">
          {data.keyframes.map((keyframe) => (
            <button
              key={keyframe.id}
              type="button"
              title={`${keyframe.time.toFixed(2)} seconds`}
              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white bg-orange-500 shadow"
              style={{ left: `${keyframe.time * 100}%` }}
              onClick={() => data.setCurrentTime(keyframe.time)}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!data.selectedPath}
            className="flex h-9 flex-1 items-center justify-center gap-2 border border-black/20 bg-black text-[0.6rem] font-bold uppercase tracking-[0.14em] text-white disabled:opacity-30"
            onClick={data.addKeyframe}
          ><FiPlus /> Add keyframe</button>
          {data.keyframes.length > 0 && (
            <button
              type="button"
              aria-label="Remove last keyframe"
              className="grid size-9 place-items-center border border-black/15 bg-white"
              onClick={() => data.removeKeyframe(data.keyframes[data.keyframes.length - 1].id)}
            ><FiTrash2 /></button>
          )}
        </div>
        <button
          type="button"
          disabled={!data.selectedPath || data.keyframes.length === 0}
          className="flex h-9 w-full items-center justify-center gap-2 border border-black/20 bg-white text-[0.6rem] font-bold uppercase tracking-[0.14em] disabled:opacity-30"
          onClick={async () => {
            const ok = await data.copyExport();
            setCopied(ok);
            window.setTimeout(() => setCopied(false), 1500);
          }}
        >{copied ? <FiCheck /> : <FiCopy />} {copied ? "Copied keyframes" : "Copy keyframes"}</button>
      </div>
      </aside>
    </div>
  );
}

export function KeyframingProvider({ children }: { children: ReactNode }) {
  const route = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [selected, setSelected] = useState<{ object: THREE.Object3D; scene: THREE.Scene; path: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [keyframes, setKeyframes] = useState<KeyframePose[]>([]);
  // Drafts live for the entire open editor session. Object reselection and
  // scene/gizmo raycasts may change the active draft, but must never erase it.
  const keyframeDrafts = useRef(new Map<string, KeyframePose[]>());
  const [playing, setPlaying] = useState(false);
  const [selectionLocked, setSelectionLocked] = useState(false);
  const playbackFrame = useRef<number | null>(null);
  const playbackStartedAt = useRef(0);
  const playbackStartTime = useRef(0);
  const currentTimeRef = useRef(0);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);
  const registered = useRef(new Map<string, { label: string; object: THREE.Object3D; scene: THREE.Scene }>());
  const [registeredObjects, setRegisteredObjects] = useState<Array<{ id: string; label: string }>>([]);
  const posePresetRegistry = useRef(
    new Map<string, { label: string; apply: () => void }>(),
  );
  const [posePresets, setPosePresets] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [activePosePreset, setActivePosePreset] = useState<string | null>(null);

  useEffect(() => {
    setSelected(null);
    keyframeDrafts.current.clear();
    setKeyframes([]);
    setPlaying(false);
    setSelectionLocked(false);
    posePresetRegistry.current.clear();
    setPosePresets([]);
    setActivePosePreset(null);
  }, [route]);

  useEffect(() => {
    if (enabled) return;
    setSelected(null);
    keyframeDrafts.current.clear();
    setKeyframes([]);
    setCurrentTime(0);
    setPlaying(false);
    setSelectionLocked(false);
  }, [enabled]);

  useEffect(() => {
    if (!playing || !selected || keyframes.length < 2) return;
    const lastTime = Math.max(...keyframes.map((frame) => frame.time));
    playbackStartTime.current = currentTimeRef.current >= lastTime - 0.001 ? 0 : currentTimeRef.current;
    playbackStartedAt.current = performance.now();
    const tick = (now: number) => {
      const nextTime = playbackStartTime.current + (now - playbackStartedAt.current) / 1000;
      const clamped = Math.min(nextTime, lastTime);
      applyInterpolatedKeyframes(selected.object, keyframes, clamped);
      setCurrentTime(clamped);
      if (clamped >= lastTime) {
        setPlaying(false);
        playbackFrame.current = null;
        return;
      }
      playbackFrame.current = requestAnimationFrame(tick);
    };
    playbackFrame.current = requestAnimationFrame(tick);
    return () => {
      if (playbackFrame.current !== null) cancelAnimationFrame(playbackFrame.current);
      playbackFrame.current = null;
    };
  }, [keyframes, playing, selected]);

  const registerSelection = useCallback((object: THREE.Object3D | null, scene: THREE.Scene | null) => {
    if (selectionLocked && object !== selected?.object) return;
    if (!object || !scene) {
      setSelected(null);
      setPlaying(false);
      return;
    }
    if (object === selected?.object) return;
    const path = pathFor(object, scene);
    if (path === selected?.path) {
      setSelected({ object, scene, path });
      return;
    }
    setSelected({ object, scene, path });
    setKeyframes(keyframeDrafts.current.get(path) ?? []);
    setCurrentTime(0);
    setPlaying(false);
  }, [selected?.object, selectionLocked]);

  const registerObject = useCallback((id: string, label: string, object: THREE.Object3D, scene: THREE.Scene) => {
    object.name = id;
    const existing = registered.current.get(id);
    if (
      existing?.label === label &&
      existing.object === object &&
      existing.scene === scene
    ) {
      return () => {};
    }
    registered.current.set(id, { label, object, scene });
    setRegisteredObjects([...registered.current].map(([objectId, entry]) => ({ id: objectId, label: entry.label })));
    return () => {
      registered.current.delete(id);
      setRegisteredObjects([...registered.current].map(([objectId, entry]) => ({ id: objectId, label: entry.label })));
    };
  }, []);

  const selectRegistered = useCallback((id: string) => {
    if (selectionLocked && selected?.object.name !== id) return;
    const entry = registered.current.get(id);
    if (entry) registerSelection(entry.object, entry.scene);
  }, [registerSelection, selected?.object.name, selectionLocked]);

  const registerPosePresets = useCallback(
    (presets: Array<{ id: string; label: string; apply: () => void }>) => {
      let changed = false;
      presets.forEach(({ id, label, apply }) => {
        const current = posePresetRegistry.current.get(id);
        if (current?.label !== label || current.apply !== apply) changed = true;
        posePresetRegistry.current.set(id, { label, apply });
      });
      if (changed) {
        setPosePresets(
          [...posePresetRegistry.current].map(([id, preset]) => ({
            id,
            label: preset.label,
          })),
        );
      }
      return () => {
        presets.forEach(({ id }) => posePresetRegistry.current.delete(id));
        setPosePresets(
          [...posePresetRegistry.current].map(([id, preset]) => ({
            id,
            label: preset.label,
          })),
        );
        setActivePosePreset((current) =>
          current && posePresetRegistry.current.has(current) ? current : null,
        );
      };
    },
    [],
  );

  const applyPosePreset = useCallback((id: string) => {
    const preset = posePresetRegistry.current.get(id);
    if (!preset) return;
    preset.apply();
    setActivePosePreset(id);
  }, []);

  const addKeyframe = useCallback(() => {
    if (!selected) return;
    const pose: KeyframePose = {
      id: `${currentTime.toFixed(3)}-${Date.now()}`,
      time: round(currentTime, 3),
      local: transformExport(selected.object),
      world: transformExport(selected.object, true),
    };
    setKeyframes((current) => {
      const next = [
        ...current.filter((frame) => Math.abs(frame.time - pose.time) > 0.0005),
        pose,
      ].sort((a, b) => a.time - b.time);
      keyframeDrafts.current.set(selected.path, next);
      return next;
    });
  }, [currentTime, selected]);

  const seek = useCallback((time: number) => {
    setPlaying(false);
    setCurrentTime(time);
    if (selected && keyframes.length > 0) {
      applyInterpolatedKeyframes(selected.object, keyframes, time);
    }
  }, [keyframes, selected]);

  const removeKeyframe = useCallback((id: string) => {
    setKeyframes((frames) => {
      const next = frames.filter((frame) => frame.id !== id);
      if (selected) keyframeDrafts.current.set(selected.path, next);
      return next;
    });
  }, [selected]);
  const copyExport = useCallback(async () => {
    if (!selected || keyframes.length === 0) return false;
    const payload = {
      schema: "portfolio-keyframe-debug/v1",
      exportedAt: new Date().toISOString(),
      route,
      object: { path: selected.path, name: selected.object.name || segment(selected.object), type: selected.object.type },
      durationSeconds: 1,
      interpolationHint: "position: cubic; rotation: quaternion-slerp; scale: linear",
      keyframes,
    };
    window.__LAST_KEYFRAME_DEBUG_EXPORT__ = payload;
    const text = JSON.stringify(payload, null, 2);
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    let copied = document.execCommand("copy");
    textarea.remove();
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {}
    return copied;
  }, [keyframes, route, selected]);

  const mode = useMemo(() => ({ enabled, route, setEnabled }), [enabled, route]);
  const data = useMemo(() => ({
    selectedObject: selected?.object ?? null,
    selectedPath: selected?.path ?? null,
    selectedName: selected?.object.name ?? null,
    currentTime,
    keyframes,
    playing,
    selectionLocked,
    setCurrentTime,
    seek,
    setPlaying,
    setSelectionLocked,
    addKeyframe,
    removeKeyframe,
    copyExport,
    registerSelection,
    registeredObjects,
    registerObject,
    selectRegistered,
    posePresets,
    activePosePreset,
    registerPosePresets,
    applyPosePreset,
  }), [activePosePreset, addKeyframe, applyPosePreset, copyExport, currentTime, keyframes, playing, posePresets, registerObject, registerPosePresets, registeredObjects, registerSelection, removeKeyframe, seek, selectRegistered, selected, selectionLocked]);

  return (
    <KeyframingContext.Provider value={mode}>
      <KeyframingDataContext.Provider value={data}>
        {children}
        <KeyframingPanel />
      </KeyframingDataContext.Provider>
    </KeyframingContext.Provider>
  );
}

export function useKeyframingMode() {
  const value = useContext(KeyframingContext);
  if (!value) throw new Error("useKeyframingMode must be used within KeyframingProvider");
  return value;
}

export function useKeyframeSelection() {
  const { registerSelection } = useKeyframingData();
  const scene = useThree((state) => state.scene);
  return useCallback((object: THREE.Object3D) => {
    if (isHelper(object)) return;
    object.updateWorldMatrix(true, true);
    registerSelection(object, scene);
  }, [registerSelection, scene]);
}

export function KeyframeSelect({
  object,
  children,
}: {
  object: THREE.Object3D;
  children: ReactNode;
}) {
  const { enabled } = useKeyframingMode();
  const select = useKeyframeSelection();
  return (
    <group
      name={`keyframe_${object.name || "object"}_target`}
      onClick={(event) => {
        if (!enabled) return;
        event.stopPropagation();
        select(object);
      }}
    >
      {children}
    </group>
  );
}

/** Mount inside a Canvas when the scene needs model-specific logical roots. */
export function KeyframeObjectRegistry({ objects }: { objects: THREE.Object3D[] }) {
  const { enabled } = useKeyframingMode();
  const { registerObject, selectionLocked } = useKeyframingData();
  const select = useKeyframeSelection();
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const labels = ["Board", "Left shoe", "Right shoe"];
    return objects.map((object, index) => registerObject(
      object.name || `keyframe_object_${index}`,
      labels[index] || object.name || `Object ${index + 1}`,
      object,
      scene,
    )).reduce<() => void>((next, dispose) => () => { next(); dispose(); }, () => {});
  }, [objects, registerObject, scene]);

  useEffect(() => {
    if (!enabled || selectionLocked) return;
    const element = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const selectRegistered = (event: PointerEvent) => {
      const bounds = element.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const ordered = objects
        .flatMap((object) => raycaster.intersectObject(object, true).map((hit) => ({ hit, object })))
        .sort((a, b) => a.hit.distance - b.hit.distance);
      if (!ordered[0]) return;
      event.stopPropagation();
      select(ordered[0].object);
    };
    element.addEventListener("pointerdown", selectRegistered, true);
    return () => element.removeEventListener("pointerdown", selectRegistered, true);
  }, [camera, enabled, gl, objects, select, selectionLocked]);
  return null;
}

function useKeyframingData() {
  const value = useContext(KeyframingDataContext);
  if (!value) throw new Error("useKeyframingData must be used within KeyframingProvider");
  return value;
}

export function useKeyframePosePresets(
  presets: Array<{ id: string; label: string; apply: () => void }>,
) {
  const { registerPosePresets } = useKeyframingData();
  useEffect(() => registerPosePresets(presets), [presets, registerPosePresets]);
}

export function KeyframingToggle() {
  const { enabled, setEnabled } = useKeyframingMode();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      data-page-navigation-ignore
      title="Pose scene objects and capture keyframes"
      className="flex h-8 items-center gap-2 rounded-md border border-neutral-200 bg-white px-2.5 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-neutral-700 shadow-sm transition hover:bg-neutral-50"
      onClick={() => setEnabled(!enabled)}
    >
      <FiClock className="text-sm" />
      <span className="hidden md:inline">Keyframing</span>
      <span aria-hidden className={`relative block h-5 w-9 rounded-full border ${enabled ? "border-neutral-900 bg-neutral-900" : "border-neutral-300 bg-neutral-200"}`}>
        <span className={`absolute left-0.5 top-0.5 size-3.5 rounded-full bg-white transition-transform ${enabled ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}

export function SceneKeyframingProbe() {
  const { enabled } = useKeyframingMode();
  const { playing, registerSelection, selectedObject, selectionLocked } = useKeyframingData();
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const get = useThree((state) => state.get);
  const invalidate = useThree((state) => state.invalidate);
  const [target, setTarget] = useState<THREE.Object3D | null>(null);
  const matrix = useRef(new THREE.Matrix4());
  const objectDragStart = useRef(new THREE.Matrix4());
  const desired = useRef(new THREE.Matrix4());
  const dragging = useRef(false);
  const controlsState = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (!enabled || !selectedObject || selectedObject === target) return;
    copyWorldAlignedGizmoMatrix(selectedObject, matrix.current);
    selectedObject.updateWorldMatrix(true, true);
    desired.current.copy(selectedObject.matrixWorld);
    setTarget(selectedObject);
    invalidate();
  }, [enabled, invalidate, selectedObject, target]);

  useEffect(() => {
    if (!enabled) {
      setTarget(null);
      registerSelection(null, null);
      return;
    }
    if (selectionLocked) return;
    const element = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const select = (event: PointerEvent) => {
      const bounds = element.getBoundingClientRect();
      pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(scene.children, true).find((entry) => isSelectableHit(entry.object));
      const root = hit ? selectableRoot(hit.object, scene) : null;
      if (!root) return;
      event.stopPropagation();
      copyWorldAlignedGizmoMatrix(root, matrix.current);
      root.updateWorldMatrix(true, true);
      desired.current.copy(root.matrixWorld);
      setTarget(root);
      registerSelection(root, scene);
      invalidate();
    };
    element.addEventListener("pointerdown", select, true);
    return () => element.removeEventListener("pointerdown", select, true);
  }, [camera, enabled, gl, invalidate, registerSelection, scene, selectionLocked]);

  useFrame(() => {
    if (!enabled || !target || dragging.current) return;
    copyWorldAlignedGizmoMatrix(target, matrix.current);
  });

  if (!enabled || !target || playing) return null;
  return (
    <group userData={{ keyframingHelper: true }}>
      <PivotControls
        matrix={matrix.current}
        autoTransform={false}
        activeAxes={[true, true, true]}
        axisColors={COLORS}
        hoveredColor="#f97316"
        fixed
        scale={82}
        lineWidth={3}
        opacity={0.95}
        depthTest={false}
        renderOrder={1001}
        disableScaling
        onDragStart={() => {
          dragging.current = true;
          target.updateWorldMatrix(true, true);
          objectDragStart.current.copy(target.matrixWorld);
          const controls = get().controls as { enabled?: boolean } | null;
          if (controls) {
            controlsState.current = controls.enabled ?? true;
            controls.enabled = false;
          }
        }}
        onDrag={(_local, _deltaLocal, _world, deltaWorld) => {
          desired.current
            .copy(objectDragStart.current)
            .premultiply(deltaWorld);
          applyWorldMatrix(target, desired.current);
          copyWorldAlignedGizmoMatrix(target, matrix.current);
          invalidate();
        }}
        onDragEnd={() => {
          dragging.current = false;
          const controls = get().controls as { enabled?: boolean; update?: () => void } | null;
          if (controls && controlsState.current !== undefined) {
            controls.enabled = controlsState.current;
            controls.update?.();
          }
          controlsState.current = undefined;
        }}
        userData={{ keyframingHelper: true }}
      />
    </group>
  );
}

declare global {
  interface Window {
    __LAST_KEYFRAME_DEBUG_EXPORT__?: unknown;
  }
}
