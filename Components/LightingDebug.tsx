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
import { Environment, PivotControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { usePathname } from "next/navigation";
import {
  FiCheck,
  FiCopy,
  FiPlus,
  FiSliders,
  FiSun,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import * as THREE from "three";

type HdriMode = "scene" | "neutral" | "none";
type BackgroundMode = "scene" | "transparent" | "color" | "hdri";
type ToneMappingName =
  | "ACESFilmic"
  | "Neutral"
  | "AgX"
  | "Cineon"
  | "Reinhard"
  | "Linear"
  | "None";

interface LightingSettings {
  hdri: HdriMode;
  toneMapping: ToneMappingName;
  exposure: number;
  environmentIntensity: number;
  lightMultiplier: number;
  backgroundMode: BackgroundMode;
  backgroundColor: string;
  backgroundIntensity: number;
  backgroundBlur: number;
}

interface LightSnapshot {
  id: string;
  path: string;
  name: string;
  type: string;
  color: string;
  intensity: number;
  position: [number, number, number];
  target: [number, number, number] | null;
  enabled: boolean;
  castShadow: boolean;
  angle: number | null;
  penumbra: number | null;
  distance: number | null;
  decay: number | null;
}

type EditableLightType =
  | "AmbientLight"
  | "HemisphereLight"
  | "DirectionalLight"
  | "PointLight"
  | "SpotLight";

interface EditableLight extends LightSnapshot {
  type: EditableLightType;
  helper: boolean;
  added: boolean;
}

interface LightingSnapshot {
  sceneId: string;
  sceneName: string;
  renderer: {
    toneMapping: ToneMappingName;
    exposure: number;
    outputColorSpace: string;
    shadowMapEnabled: boolean;
    shadowMapType: number;
  };
  scene: {
    background: string | null;
    environment: string | null;
    environmentIntensity: number;
    backgroundIntensity: number;
    backgroundBlurriness: number;
    focusCenter: [number, number, number];
    focusRadius: number;
  };
  lights: LightSnapshot[];
}

interface LightingDebugContextValue {
  enabled: boolean;
  route: string;
  settings: LightingSettings;
  snapshot: LightingSnapshot | null;
  lights: EditableLight[];
  selectedLightId: string | null;
  activeSceneId: string | null;
  setEnabled: (enabled: boolean) => void;
  updateSettings: (update: Partial<LightingSettings>) => void;
  registerScene: (snapshot: LightingSnapshot) => void;
  selectLight: (id: string | null) => void;
  updateLight: (id: string, update: Partial<EditableLight>) => void;
  addLight: (type: EditableLightType) => void;
  removeLight: (id: string) => void;
}

const DEFAULT_SETTINGS: LightingSettings = {
  hdri: "scene",
  toneMapping: "ACESFilmic",
  exposure: 1,
  environmentIntensity: 1,
  lightMultiplier: 1,
  backgroundMode: "scene",
  backgroundColor: "#ffffff",
  backgroundIntensity: 1,
  backgroundBlur: 0,
};

const LightingDebugContext = createContext<LightingDebugContextValue | null>(
  null,
);

const TONE_MAPPING_BY_NAME: Record<ToneMappingName, THREE.ToneMapping> = {
  ACESFilmic: THREE.ACESFilmicToneMapping,
  Neutral: THREE.NeutralToneMapping,
  AgX: THREE.AgXToneMapping,
  Cineon: THREE.CineonToneMapping,
  Reinhard: THREE.ReinhardToneMapping,
  Linear: THREE.LinearToneMapping,
  None: THREE.NoToneMapping,
};

function round(value: number, precision = 4) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function toneMappingName(value: THREE.ToneMapping): ToneMappingName {
  const found = Object.entries(TONE_MAPPING_BY_NAME).find(
    ([, mapping]) => mapping === value,
  );
  return (found?.[0] as ToneMappingName | undefined) ?? "ACESFilmic";
}

function objectPath(object: THREE.Object3D, scene: THREE.Scene) {
  const parts: string[] = [];
  let current: THREE.Object3D | null = object;
  while (current && current !== scene) {
    parts.unshift(current.name || current.type);
    current = current.parent;
  }
  return [scene.name || "Scene", ...parts].join("/");
}

function textureLabel(texture: THREE.Texture | null) {
  if (!texture) return null;
  const source = texture.source?.data as { src?: string } | undefined;
  return texture.name || source?.src || texture.uuid;
}

function backgroundLabel(background: THREE.Color | THREE.Texture | null) {
  if (!background) return null;
  if (background instanceof THREE.Color) return `#${background.getHexString()}`;
  return textureLabel(background);
}

function vectorTuple(vector: THREE.Vector3): [number, number, number] {
  return [round(vector.x), round(vector.y), round(vector.z)];
}

function lightTarget(light: THREE.Light) {
  if (
    !(light instanceof THREE.DirectionalLight) &&
    !(light instanceof THREE.SpotLight)
  ) {
    return null;
  }
  return vectorTuple(light.target.position);
}

function findSceneFocus(scene: THREE.Scene) {
  scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  const zoomableRoots: THREE.Object3D[] = [];

  scene.traverse((object) => {
    if (!object.visible || !object.userData.zoomable) return;
    let ancestor = object.parent;
    while (ancestor && ancestor !== scene) {
      if (ancestor.userData.zoomable) return;
      ancestor = ancestor.parent;
    }
    zoomableRoots.push(object);
  });

  if (zoomableRoots.length > 0) {
    zoomableRoots.forEach((object) => bounds.expandByObject(object, true));
  } else {
    scene.traverse((object) => {
      if (
        !(object instanceof THREE.Mesh) ||
        !object.visible ||
        object.userData.lightingDebugHelper
      ) {
        return;
      }
      bounds.expandByObject(object, true);
    });
  }

  if (bounds.isEmpty()) {
    return { center: new THREE.Vector3(), radius: 5 };
  }
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  return {
    center: sphere.center,
    radius: Math.max(sphere.radius, 1),
  };
}

function captureScene(
  scene: THREE.Scene,
  gl: THREE.WebGLRenderer,
): LightingSnapshot {
  const lights: LightSnapshot[] = [];
  const focus = findSceneFocus(scene);
  scene.traverse((object) => {
    if (!(object instanceof THREE.Light)) return;
    lights.push({
      id: object.uuid,
      path: objectPath(object, scene),
      name: object.name || object.type,
      type: object.type,
      color: `#${object.color.getHexString()}`,
      intensity: round(object.intensity),
      position: [
        round(object.position.x),
        round(object.position.y),
        round(object.position.z),
      ],
      target: lightTarget(object),
      enabled: object.visible,
      castShadow: object.castShadow,
      angle:
        object instanceof THREE.SpotLight ? round(object.angle) : null,
      penumbra:
        object instanceof THREE.SpotLight ? round(object.penumbra) : null,
      distance:
        object instanceof THREE.PointLight || object instanceof THREE.SpotLight
          ? round(object.distance)
          : null,
      decay:
        object instanceof THREE.PointLight || object instanceof THREE.SpotLight
          ? round(object.decay)
          : null,
    });
  });

  return {
    sceneId: scene.uuid,
    sceneName: scene.name || "Scene",
    renderer: {
      toneMapping: toneMappingName(gl.toneMapping),
      exposure: round(gl.toneMappingExposure),
      outputColorSpace: gl.outputColorSpace,
      shadowMapEnabled: gl.shadowMap.enabled,
      shadowMapType: gl.shadowMap.type,
    },
    scene: {
      background: backgroundLabel(scene.background),
      environment: textureLabel(scene.environment),
      environmentIntensity: round(scene.environmentIntensity),
      backgroundIntensity: round(scene.backgroundIntensity),
      backgroundBlurriness: round(scene.backgroundBlurriness),
      focusCenter: vectorTuple(focus.center),
      focusRadius: round(focus.radius),
    },
    lights,
  };
}

function RangeRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid grid-cols-[7.25rem_minmax(0,1fr)_3rem] items-center gap-2">
      <span className="text-[0.55rem] font-medium uppercase tracking-[0.16em] text-black/55">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-w-0 accent-orange-600"
      />
      <output className="rounded-md border border-black/10 bg-white px-1 py-1 text-center font-mono text-[0.55rem] text-black/60">
        {value.toFixed(2)}
      </output>
    </label>
  );
}

function SelectRow({
  label,
  value,
  children,
  onChange,
}: {
  label: string;
  value: string;
  children: ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid grid-cols-[7.25rem_minmax(0,1fr)] items-center gap-2">
      <span className="text-[0.55rem] font-medium uppercase tracking-[0.16em] text-black/55">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 min-w-0 rounded-md border border-black/15 bg-white px-2 font-mono text-[0.58rem] text-black/70"
      >
        {children}
      </select>
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      className="flex w-full items-center justify-between gap-3 disabled:opacity-35"
      onClick={() => onChange(!checked)}
    >
      <span className="text-[0.55rem] font-medium uppercase tracking-[0.16em] text-black/55">
        {label}
      </span>
      <span
        aria-hidden
        className={`relative block h-5 w-9 rounded-full border transition-colors ${
          checked
            ? "border-neutral-900 bg-neutral-900"
            : "border-neutral-300 bg-neutral-200"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-3.5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </span>
    </button>
  );
}

function ColorRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid grid-cols-[7.25rem_minmax(0,1fr)] items-center gap-2">
      <span className="text-[0.55rem] font-medium uppercase tracking-[0.16em] text-black/55">
        Color
      </span>
      <span className="flex h-8 items-center gap-2 rounded-md border border-black/15 bg-white px-1.5">
        <input
          type="color"
          value={value}
          aria-label="Light color"
          className="h-6 w-8 border-0 bg-transparent p-0"
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="font-mono text-[0.58rem] uppercase text-black/55">
          {value}
        </span>
      </span>
    </label>
  );
}

function isEditableLightType(type: string): type is EditableLightType {
  return [
    "AmbientLight",
    "HemisphereLight",
    "DirectionalLight",
    "PointLight",
    "SpotLight",
  ].includes(type);
}

function LightingDebugPanel() {
  const context = useLightingDebug();
  const [copied, setCopied] = useState(false);
  const [newLightType, setNewLightType] =
    useState<EditableLightType>("DirectionalLight");
  if (!context.enabled) return null;

  const copySettings = async () => {
    const payload = {
      schema: "portfolio-lighting-debug/v1",
      exportedAt: new Date().toISOString(),
      route: context.route,
      hdri:
        context.settings.hdri === "neutral"
          ? "/Images/neutral.hdr"
          : context.settings.hdri,
      settings: context.settings,
      sourceScene: context.snapshot,
      lightEditor: {
        selectedLightId: context.selectedLightId,
        lights: context.lights,
      },
    };
    window.__LAST_LIGHTING_DEBUG_EXPORT__ = payload;
    const text = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const settings = context.settings;
  const selectedLight = context.lights.find(
    (light) => light.id === context.selectedLightId,
  );
  return (
    <aside
      data-page-navigation-ignore
      aria-label="Lighting and environment editor"
      className="fixed right-4 top-[3.35rem] z-[106] flex max-h-[calc(100vh-4.35rem)] w-[24rem] max-w-[calc(100vw-2rem)] flex-col border border-black/15 bg-[#f8f8f8]/97 text-black shadow-2xl backdrop-blur-md"
    >
      <header className="flex items-center gap-3 border-b border-black/10 px-4 py-3">
        <span className="grid size-8 place-items-center border border-black/15 bg-white">
          <FiSun />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-orange-600">
            Lighting
          </p>
          <p className="truncate font-mono text-[0.62rem] text-black/45">
            {context.route}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close lighting editor"
          className="grid size-8 place-items-center border border-black/15 bg-white"
          onClick={() => context.setEnabled(false)}
        >
          <FiX />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4 [scrollbar-color:#a3a3a3_transparent] [scrollbar-width:thin]">
        <section className="space-y-3">
          <p className="text-[0.55rem] font-bold uppercase tracking-[0.2em] text-black/35">
            Environment
          </p>
          <SelectRow
            label="HDRI"
            value={settings.hdri}
            onChange={(value) =>
              context.updateSettings({ hdri: value as HdriMode })
            }
          >
            <option value="scene">Scene default</option>
            <option value="neutral">Neutral HDR</option>
            <option value="none">No environment</option>
          </SelectRow>
          <RangeRow
            label="Environment"
            value={settings.environmentIntensity}
            min={0}
            max={4}
            step={0.01}
            onChange={(value) =>
              context.updateSettings({ environmentIntensity: value })
            }
          />
          <RangeRow
            label="Scene lights"
            value={settings.lightMultiplier}
            min={0}
            max={4}
            step={0.01}
            onChange={(value) =>
              context.updateSettings({ lightMultiplier: value })
            }
          />
        </section>

        <section className="space-y-3 border-t border-black/10 pt-4">
          <p className="text-[0.55rem] font-bold uppercase tracking-[0.2em] text-black/35">
            Renderer
          </p>
          <SelectRow
            label="Tone mapping"
            value={settings.toneMapping}
            onChange={(value) =>
              context.updateSettings({ toneMapping: value as ToneMappingName })
            }
          >
            {Object.keys(TONE_MAPPING_BY_NAME).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </SelectRow>
          <RangeRow
            label="Exposure"
            value={settings.exposure}
            min={0.05}
            max={3}
            step={0.01}
            onChange={(value) => context.updateSettings({ exposure: value })}
          />
        </section>

        <section className="space-y-3 border-t border-black/10 pt-4">
          <p className="text-[0.55rem] font-bold uppercase tracking-[0.2em] text-black/35">
            Background
          </p>
          <SelectRow
            label="Mode"
            value={settings.backgroundMode}
            onChange={(value) =>
              context.updateSettings({ backgroundMode: value as BackgroundMode })
            }
          >
            <option value="scene">Scene default</option>
            <option value="transparent">Transparent</option>
            <option value="color">Solid color</option>
            <option value="hdri" disabled={settings.hdri !== "neutral"}>
              HDRI
            </option>
          </SelectRow>
          {settings.backgroundMode === "color" && (
            <label className="grid grid-cols-[7.25rem_minmax(0,1fr)] items-center gap-2">
              <span className="text-[0.55rem] font-medium uppercase tracking-[0.16em] text-black/55">
                Color
              </span>
              <input
                type="color"
                value={settings.backgroundColor}
                onChange={(event) =>
                  context.updateSettings({ backgroundColor: event.target.value })
                }
                className="h-8 w-full rounded-md border border-black/15 bg-white p-1"
              />
            </label>
          )}
          {settings.backgroundMode === "hdri" && (
            <>
              <RangeRow
                label="Intensity"
                value={settings.backgroundIntensity}
                min={0}
                max={3}
                step={0.01}
                onChange={(value) =>
                  context.updateSettings({ backgroundIntensity: value })
                }
              />
              <RangeRow
                label="Blur"
                value={settings.backgroundBlur}
                min={0}
                max={1}
                step={0.01}
                onChange={(value) =>
                  context.updateSettings({ backgroundBlur: value })
                }
              />
            </>
          )}
        </section>

        <section className="space-y-3 border-t border-black/10 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[0.55rem] font-bold uppercase tracking-[0.2em] text-black/35">
              Scene lights
            </p>
            <span className="font-mono text-[0.55rem] text-black/40">
              {context.lights.length}
            </span>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_2.5rem] gap-2">
            <select
              aria-label="New light type"
              value={newLightType}
              className="h-8 min-w-0 rounded-md border border-black/15 bg-white px-2 font-mono text-[0.58rem] text-black/70"
              onChange={(event) =>
                setNewLightType(event.target.value as EditableLightType)
              }
            >
              <option value="AmbientLight">Ambient light</option>
              <option value="HemisphereLight">Hemisphere light</option>
              <option value="DirectionalLight">Directional light</option>
              <option value="PointLight">Point light</option>
              <option value="SpotLight">Spot light</option>
            </select>
            <button
              type="button"
              aria-label="Add light"
              title="Add light"
              className="grid h-8 place-items-center border border-black/15 bg-white hover:border-orange-500"
              onClick={() => context.addLight(newLightType)}
            >
              <FiPlus />
            </button>
          </div>
          <div className="space-y-1.5">
            {context.lights.map((light) => (
              <div
                key={light.id}
                className={`flex items-center gap-2 border bg-white px-2 py-1.5 ${
                  light.id === context.selectedLightId
                    ? "border-orange-500 ring-1 ring-orange-200"
                    : "border-black/10"
                }`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => context.selectLight(light.id)}
                >
                  <span className="block truncate text-[0.58rem] font-medium text-black/65">
                    {light.name}
                  </span>
                  <span className="block truncate font-mono text-[0.5rem] text-black/35">
                    {light.type} · {light.intensity.toFixed(2)}
                  </span>
                </button>
                <button
                  type="button"
                  role="switch"
                  data-page-navigation-ignore
                  aria-label={`${light.name} enabled`}
                  aria-checked={light.enabled}
                  className={`relative block h-5 w-9 shrink-0 rounded-full border ${
                    light.enabled
                      ? "border-neutral-900 bg-neutral-900"
                      : "border-neutral-300 bg-neutral-200"
                  }`}
                  onPointerDownCapture={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    context.selectLight(light.id);
                    context.updateLight(light.id, {
                      enabled: !light.enabled,
                    });
                  }}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 size-3.5 rounded-full bg-white transition-transform ${
                      light.enabled ? "translate-x-4" : ""
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          {selectedLight && (
            <div className="space-y-3 border border-black/10 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[0.62rem] font-semibold text-black/70">
                    {selectedLight.name}
                  </p>
                  <p className="font-mono text-[0.5rem] text-black/35">
                    {selectedLight.type}
                  </p>
                </div>
                {selectedLight.added && (
                  <button
                    type="button"
                    aria-label="Remove selected light"
                    title="Remove selected light"
                    className="grid size-7 shrink-0 place-items-center border border-black/10 text-black/45 hover:border-red-300 hover:text-red-600"
                    onClick={() => context.removeLight(selectedLight.id)}
                  >
                    <FiTrash2 />
                  </button>
                )}
              </div>
              <ToggleRow
                label="Enabled"
                checked={selectedLight.enabled}
                onChange={(enabled) =>
                  context.updateLight(selectedLight.id, { enabled })
                }
              />
              <ToggleRow
                label="Helper + gizmo"
                checked={selectedLight.helper}
                onChange={(helper) =>
                  context.updateLight(selectedLight.id, { helper })
                }
              />
              <ColorRow
                value={selectedLight.color}
                onChange={(color) =>
                  context.updateLight(selectedLight.id, { color })
                }
              />
              <RangeRow
                label="Strength"
                value={selectedLight.intensity}
                min={0}
                max={20}
                step={0.01}
                onChange={(intensity) =>
                  context.updateLight(selectedLight.id, { intensity })
                }
              />
              {![
                "AmbientLight",
                "HemisphereLight",
              ].includes(selectedLight.type) && (
                <ToggleRow
                  label="Cast shadow"
                  checked={selectedLight.castShadow}
                  onChange={(castShadow) =>
                    context.updateLight(selectedLight.id, { castShadow })
                  }
                />
              )}
              {(selectedLight.type === "PointLight" ||
                selectedLight.type === "SpotLight") && (
                <>
                  <RangeRow
                    label="Distance"
                    value={selectedLight.distance ?? 0}
                    min={0}
                    max={100}
                    step={0.1}
                    onChange={(distance) =>
                      context.updateLight(selectedLight.id, { distance })
                    }
                  />
                  <RangeRow
                    label="Decay"
                    value={selectedLight.decay ?? 2}
                    min={0}
                    max={4}
                    step={0.01}
                    onChange={(decay) =>
                      context.updateLight(selectedLight.id, { decay })
                    }
                  />
                </>
              )}
              {selectedLight.type === "SpotLight" && (
                <>
                  <RangeRow
                    label="Cone angle"
                    value={THREE.MathUtils.radToDeg(
                      selectedLight.angle ?? Math.PI / 4,
                    )}
                    min={1}
                    max={90}
                    step={1}
                    onChange={(angle) =>
                      context.updateLight(selectedLight.id, {
                        angle: THREE.MathUtils.degToRad(angle),
                      })
                    }
                  />
                  <RangeRow
                    label="Penumbra"
                    value={selectedLight.penumbra ?? 0}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(penumbra) =>
                      context.updateLight(selectedLight.id, { penumbra })
                    }
                  />
                </>
              )}
              <div className="grid grid-cols-3 gap-1 border-t border-black/10 pt-2 font-mono text-[0.5rem] text-black/40">
                {selectedLight.position.map((value, index) => (
                  <span
                    key={index}
                    className="rounded bg-black/[0.035] px-1 py-1 text-center"
                  >
                    {["X", "Y", "Z"][index]} {value.toFixed(2)}
                  </span>
                ))}
              </div>
              {selectedLight.target && (
                <p className="font-mono text-[0.5rem] text-black/40">
                  Aiming at {selectedLight.target.map((value) => value.toFixed(2)).join(", ")}
                </p>
              )}
              <p className="text-[0.52rem] leading-relaxed text-black/35">
                Drag the world-aligned arrows to move the light. Directional and
                spot lights point at the object center by default and expose
                rotation arcs for aiming.
              </p>
            </div>
          )}
        </section>
      </div>

      <footer className="border-t border-black/10 p-3">
        <button
          type="button"
          disabled={!context.snapshot}
          className="flex h-9 w-full items-center justify-center gap-2 border border-black/20 bg-black text-[0.6rem] font-bold uppercase tracking-[0.14em] text-white disabled:opacity-30"
          onClick={copySettings}
        >
          {copied ? <FiCheck /> : <FiCopy />}
          {copied ? "Copied lighting" : "Copy lighting settings"}
        </button>
      </footer>
    </aside>
  );
}

export function LightingDebugProvider({ children }: { children: ReactNode }) {
  const route = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [snapshot, setSnapshot] = useState<LightingSnapshot | null>(null);
  const [lights, setLights] = useState<EditableLight[]>([]);
  const [selectedLightId, setSelectedLightId] = useState<string | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const activeSceneIdRef = useRef<string | null>(null);

  useEffect(() => {
    setEnabled(false);
    setSnapshot(null);
    setLights([]);
    setSelectedLightId(null);
    setActiveSceneId(null);
    activeSceneIdRef.current = null;
    setSettings(DEFAULT_SETTINGS);
  }, [route]);

  const updateSettings = useCallback((update: Partial<LightingSettings>) => {
    setSettings((current) => ({ ...current, ...update }));
  }, []);

  const registerScene = useCallback((nextSnapshot: LightingSnapshot) => {
    if (activeSceneIdRef.current === nextSnapshot.sceneId) return;
    activeSceneIdRef.current = nextSnapshot.sceneId;
    setActiveSceneId(nextSnapshot.sceneId);
    setSnapshot(nextSnapshot);
    const editableLights = nextSnapshot.lights
      .filter((light) => isEditableLightType(light.type))
      .map(
        (light): EditableLight => ({
          ...light,
          type: light.type as EditableLightType,
          position: ["AmbientLight", "HemisphereLight"].includes(light.type)
            ? nextSnapshot.scene.focusCenter
            : light.position,
          target:
            light.type === "PointLight" && !light.target
              ? nextSnapshot.scene.focusCenter
              : light.target,
          helper: false,
          added: false,
        }),
      );
    setLights(editableLights);
    setSelectedLightId(editableLights[0]?.id ?? null);
    setSettings({
      ...DEFAULT_SETTINGS,
      toneMapping: nextSnapshot.renderer.toneMapping,
      exposure: nextSnapshot.renderer.exposure,
      environmentIntensity: nextSnapshot.scene.environmentIntensity,
      backgroundIntensity: nextSnapshot.scene.backgroundIntensity,
      backgroundBlur: nextSnapshot.scene.backgroundBlurriness,
    });
  }, []);

  const selectLight = useCallback((id: string | null) => {
    setSelectedLightId(id);
  }, []);

  const updateLight = useCallback(
    (id: string, update: Partial<EditableLight>) => {
      setLights((current) =>
        current.map((light) =>
          light.id === id ? { ...light, ...update } : light,
        ),
      );
    },
    [],
  );

  const addLight = useCallback(
    (type: EditableLightType) => {
      const id = `debug-light-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const index = Date.now().toString().slice(-4);
      const directional = type === "DirectionalLight" || type === "SpotLight";
      const positional = !["AmbientLight", "HemisphereLight"].includes(type);
      const center = snapshot?.scene.focusCenter ?? [0, 0, 0];
      const radius = Math.max(snapshot?.scene.focusRadius ?? 5, 1);
      const position: [number, number, number] = positional
        ? [
            round(center[0] + radius * 0.22),
            round(center[1] + radius * 0.22),
            round(center[2] + radius * 0.28),
          ]
        : [...center];
      const light: EditableLight = {
        id,
        path: `Scene/${type}[debug-${index}]`,
        name: `Debug ${type.replace("Light", " light")}`,
        type,
        color: "#ffffff",
        intensity: type === "AmbientLight" ? 0.5 : 1,
        position,
        target:
          directional || type === "PointLight" ? [...center] : null,
        enabled: true,
        castShadow: false,
        angle: type === "SpotLight" ? Math.PI / 4 : null,
        penumbra: type === "SpotLight" ? 0.25 : null,
        distance: type === "SpotLight" || type === "PointLight" ? 0 : null,
        decay: type === "SpotLight" || type === "PointLight" ? 2 : null,
        helper: true,
        added: true,
      };
      setLights((current) => [...current, light]);
      setSelectedLightId(id);
    },
    [snapshot],
  );

  const removeLight = useCallback((id: string) => {
    setLights((current) => {
      const next = current.filter((light) => light.id !== id || !light.added);
      setSelectedLightId((selected) =>
        selected === id ? next[0]?.id ?? null : selected,
      );
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      enabled,
      route,
      settings,
      snapshot,
      lights,
      selectedLightId,
      activeSceneId,
      setEnabled,
      updateSettings,
      registerScene,
      selectLight,
      updateLight,
      addLight,
      removeLight,
    }),
    [
      activeSceneId,
      enabled,
      addLight,
      lights,
      registerScene,
      removeLight,
      route,
      selectedLightId,
      selectLight,
      settings,
      snapshot,
      updateLight,
      updateSettings,
    ],
  );

  return (
    <LightingDebugContext.Provider value={value}>
      {children}
      <LightingDebugPanel />
    </LightingDebugContext.Provider>
  );
}

export function useLightingDebug() {
  const context = useContext(LightingDebugContext);
  if (!context) {
    throw new Error("useLightingDebug must be used within LightingDebugProvider");
  }
  return context;
}

export function LightingDebugToggle() {
  const { enabled, setEnabled } = useLightingDebug();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      data-page-navigation-ignore
      title="Adjust and export scene lighting"
      className="flex h-8 items-center gap-2 rounded-md border border-neutral-200 bg-white px-2.5 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-neutral-700 shadow-sm transition hover:bg-neutral-50"
      onClick={() => setEnabled(!enabled)}
    >
      <FiSliders className="text-sm" />
      <span className="hidden xl:inline">Lighting</span>
      <span
        aria-hidden
        className={`relative block h-5 w-9 rounded-full border ${
          enabled
            ? "border-neutral-900 bg-neutral-900"
            : "border-neutral-300 bg-neutral-200"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-3.5 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-4" : ""
          }`}
        />
      </span>
    </button>
  );
}

interface RuntimeLightBaseline {
  light: THREE.Light;
  visible: boolean;
  color: THREE.Color;
  intensity: number;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  castShadow: boolean;
  targetPosition: THREE.Vector3 | null;
  angle: number | null;
  penumbra: number | null;
  distance: number | null;
  decay: number | null;
}

interface EditableOrbitControls {
  enabled?: boolean;
  update?: () => void;
}

const LIGHT_GIZMO_COLORS: [string, string, string] = [
  "#ef4444",
  "#22c55e",
  "#3b82f6",
];
const LIGHT_GIZMO_POSITION = new THREE.Vector3();
const LIGHT_GIZMO_PROJECTED = new THREE.Vector3();
const LIGHT_GIZMO_FOCUS_PROJECTED = new THREE.Vector3();
const LIGHT_GIZMO_SCALE = new THREE.Vector3(1, 1, 1);
const LIGHT_FORWARD = new THREE.Vector3(0, 0, -1);
const LIGHT_GIZMO_SCREEN_MARGIN = 0.72;

function aimableLight(
  light: THREE.Light,
): light is THREE.DirectionalLight | THREE.SpotLight {
  return (
    light instanceof THREE.DirectionalLight || light instanceof THREE.SpotLight
  );
}

function setWorldPosition(object: THREE.Object3D, worldPosition: THREE.Vector3) {
  if (!object.parent) {
    object.position.copy(worldPosition);
  } else {
    object.parent.updateWorldMatrix(true, false);
    object.position.copy(object.parent.worldToLocal(worldPosition.clone()));
  }
  object.updateMatrix();
  object.updateWorldMatrix(false, true);
}

function worldAlignedLightMatrix(
  light: THREE.Light,
  matrix: THREE.Matrix4,
  camera: THREE.Camera,
  focusCenter: THREE.Vector3,
) {
  light.updateWorldMatrix(true, false);
  light.getWorldPosition(LIGHT_GIZMO_POSITION);
  LIGHT_GIZMO_PROJECTED.copy(LIGHT_GIZMO_POSITION).project(camera);
  const projectionIsVisible =
    Number.isFinite(LIGHT_GIZMO_PROJECTED.x) &&
    Number.isFinite(LIGHT_GIZMO_PROJECTED.y) &&
    Number.isFinite(LIGHT_GIZMO_PROJECTED.z) &&
    Math.abs(LIGHT_GIZMO_PROJECTED.x) <= LIGHT_GIZMO_SCREEN_MARGIN &&
    Math.abs(LIGHT_GIZMO_PROJECTED.y) <= LIGHT_GIZMO_SCREEN_MARGIN &&
    LIGHT_GIZMO_PROJECTED.z >= -1 &&
    LIGHT_GIZMO_PROJECTED.z <= 1;

  if (!projectionIsVisible) {
    LIGHT_GIZMO_FOCUS_PROJECTED.copy(focusCenter).project(camera);
    LIGHT_GIZMO_PROJECTED.set(
      THREE.MathUtils.clamp(
        Number.isFinite(LIGHT_GIZMO_PROJECTED.x)
          ? LIGHT_GIZMO_PROJECTED.x
          : 0,
        -LIGHT_GIZMO_SCREEN_MARGIN,
        LIGHT_GIZMO_SCREEN_MARGIN,
      ),
      THREE.MathUtils.clamp(
        Number.isFinite(LIGHT_GIZMO_PROJECTED.y)
          ? LIGHT_GIZMO_PROJECTED.y
          : 0,
        -LIGHT_GIZMO_SCREEN_MARGIN,
        LIGHT_GIZMO_SCREEN_MARGIN,
      ),
      THREE.MathUtils.clamp(
        Number.isFinite(LIGHT_GIZMO_FOCUS_PROJECTED.z)
          ? LIGHT_GIZMO_FOCUS_PROJECTED.z
          : 0,
        -0.95,
        0.95,
      ),
    );
    LIGHT_GIZMO_POSITION.copy(LIGHT_GIZMO_PROJECTED).unproject(camera);
  }

  matrix.identity().setPosition(LIGHT_GIZMO_POSITION);
  return LIGHT_GIZMO_POSITION;
}

function createRuntimeLight(entry: EditableLight) {
  let light: THREE.Light;
  if (entry.type === "AmbientLight") {
    light = new THREE.AmbientLight(entry.color, entry.intensity);
  } else if (entry.type === "HemisphereLight") {
    light = new THREE.HemisphereLight(entry.color, "#30343b", entry.intensity);
  } else if (entry.type === "DirectionalLight") {
    light = new THREE.DirectionalLight(entry.color, entry.intensity);
  } else if (entry.type === "PointLight") {
    light = new THREE.PointLight(
      entry.color,
      entry.intensity,
      entry.distance ?? 0,
      entry.decay ?? 2,
    );
  } else {
    light = new THREE.SpotLight(
      entry.color,
      entry.intensity,
      entry.distance ?? 0,
      entry.angle ?? Math.PI / 4,
      entry.penumbra ?? 0.25,
      entry.decay ?? 2,
    );
  }
  light.name = entry.name;
  light.userData.lightingDebugAdded = true;
  light.userData.lightingDebugId = entry.id;
  return light;
}

function applyEditableLight(
  light: THREE.Light,
  entry: EditableLight,
  multiplier: number,
) {
  light.name = entry.name;
  light.visible = entry.enabled;
  light.color.set(entry.color);
  light.intensity = entry.enabled ? entry.intensity * multiplier : 0;
  light.position.fromArray(entry.position);
  light.castShadow = entry.castShadow;

  if (light instanceof THREE.PointLight || light instanceof THREE.SpotLight) {
    light.distance = entry.distance ?? 0;
    light.decay = entry.decay ?? 2;
  }
  if (light instanceof THREE.SpotLight) {
    light.angle = entry.angle ?? Math.PI / 4;
    light.penumbra = entry.penumbra ?? 0.25;
  }
  if (entry.target) {
    const debugTarget =
      light.userData.lightingDebugTarget instanceof THREE.Vector3
        ? light.userData.lightingDebugTarget
        : new THREE.Vector3();
    debugTarget.fromArray(entry.target);
    light.userData.lightingDebugTarget = debugTarget;
  }
  if (aimableLight(light) && entry.target) {
    light.target.position.fromArray(entry.target);
    light.target.updateMatrix();
    light.target.updateWorldMatrix(true, true);
  }
  light.updateMatrix();
  light.updateWorldMatrix(true, true);
}

function createLightHelper(light: THREE.Light, sceneRadius: number) {
  const markerSize = THREE.MathUtils.clamp(sceneRadius * 0.065, 0.35, 30);
  let helper: THREE.Object3D;
  if (light instanceof THREE.SpotLight) {
    helper = new THREE.SpotLightHelper(light);
  } else if (light instanceof THREE.DirectionalLight) {
    helper = new THREE.DirectionalLightHelper(light, markerSize * 2.5);
  } else if (light instanceof THREE.PointLight) {
    const group = new THREE.Group() as THREE.Group & {
      update?: () => void;
      dispose?: () => void;
    };
    const marker = new THREE.PointLightHelper(light, markerSize);
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(),
      Math.max(sceneRadius, 1),
      0xf97316,
      markerSize * 0.8,
      markerSize * 0.45,
    );
    const lightPosition = new THREE.Vector3();
    const direction = new THREE.Vector3();
    group.add(marker, arrow);
    group.update = () => {
      marker.update();
      light.getWorldPosition(lightPosition);
      const target =
        light.userData.lightingDebugTarget instanceof THREE.Vector3
          ? light.userData.lightingDebugTarget
          : new THREE.Vector3();
      direction.copy(target).sub(lightPosition);
      const distance = Math.max(direction.length(), 0.001);
      direction.normalize();
      arrow.position.copy(lightPosition);
      arrow.setDirection(direction);
      arrow.setLength(
        distance,
        Math.min(markerSize * 0.8, distance * 0.22),
        Math.min(markerSize * 0.45, distance * 0.12),
      );
    };
    group.dispose = () => {
      marker.dispose();
      arrow.line.geometry.dispose();
      const lineMaterials = Array.isArray(arrow.line.material)
        ? arrow.line.material
        : [arrow.line.material];
      lineMaterials.forEach((material) => material.dispose());
      arrow.cone.geometry.dispose();
      const coneMaterials = Array.isArray(arrow.cone.material)
        ? arrow.cone.material
        : [arrow.cone.material];
      coneMaterials.forEach((material) => material.dispose());
    };
    group.update();
    helper = group;
  } else if (light instanceof THREE.HemisphereLight) {
    helper = new THREE.HemisphereLightHelper(light, markerSize);
  } else {
    helper = new THREE.Mesh(
      new THREE.SphereGeometry(markerSize, 12, 8),
      new THREE.MeshBasicMaterial({
        color: light.color,
        wireframe: true,
        depthTest: false,
        toneMapped: false,
      }),
    );
    helper.position.copy(light.getWorldPosition(new THREE.Vector3()));
  }
  helper.name = `Lighting helper: ${light.name}`;
  helper.userData.lightingDebugHelper = true;
  helper.renderOrder = 1200;
  helper.traverse((object) => {
    object.userData.lightingDebugHelper = true;
    object.renderOrder = 1200;
    if (object instanceof THREE.Line || object instanceof THREE.Mesh) {
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => {
        material.depthTest = false;
        material.transparent = true;
        material.opacity = 0.9;
      });
    }
  });
  return helper;
}

function disposeLightHelper(helper: THREE.Object3D) {
  const disposable = helper as THREE.Object3D & { dispose?: () => void };
  if (disposable.dispose) {
    disposable.dispose();
    return;
  }
  helper.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach((material) => material.dispose());
  });
}

function LightTransformGizmo({
  light,
  entry,
  focusCenter,
  onCommit,
}: {
  light: THREE.Light;
  entry: EditableLight;
  focusCenter: [number, number, number];
  onCommit: (update: Partial<EditableLight>) => void;
}) {
  const get = useThree((state) => state.get);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const matrix = useRef(new THREE.Matrix4());
  const dragStartMatrix = useRef(new THREE.Matrix4());
  const desiredMatrix = useRef(new THREE.Matrix4());
  const focusPosition = useMemo(
    () => new THREE.Vector3().fromArray(focusCenter),
    [focusCenter],
  );
  const actualStartPosition = useRef(new THREE.Vector3());
  const anchorStartPosition = useRef(new THREE.Vector3());
  const translatedLightPosition = useRef(new THREE.Vector3());
  const startDirection = useRef(new THREE.Vector3(0, 0, -1));
  const targetDistance = useRef(5);
  const decomposedPosition = useRef(new THREE.Vector3());
  const decomposedQuaternion = useRef(new THREE.Quaternion());
  const decomposedScale = useRef(new THREE.Vector3());
  const controlsEnabled = useRef<boolean | undefined>(undefined);
  const dragging = useRef(false);

  useEffect(() => {
    worldAlignedLightMatrix(
      light,
      matrix.current,
      camera,
      focusPosition,
    );
    invalidate();
  }, [camera, entry.position, entry.target, focusPosition, invalidate, light]);

  useFrame(() => {
    if (dragging.current) return;
    worldAlignedLightMatrix(
      light,
      matrix.current,
      camera,
      focusPosition,
    );
  });

  return (
    <group userData={{ lightingDebugHelper: true }}>
      <PivotControls
        matrix={matrix.current}
        autoTransform={false}
        activeAxes={[true, true, true]}
        axisColors={LIGHT_GIZMO_COLORS}
        hoveredColor="#f97316"
        fixed
        scale={82}
        lineWidth={3}
        opacity={0.95}
        depthTest={false}
        renderOrder={1201}
        disableScaling
        disableRotations={!aimableLight(light)}
        onDragStart={() => {
          dragging.current = true;
          worldAlignedLightMatrix(
            light,
            matrix.current,
            camera,
            focusPosition,
          );
          dragStartMatrix.current.copy(matrix.current);
          matrix.current.decompose(
            anchorStartPosition.current,
            decomposedQuaternion.current,
            decomposedScale.current,
          );
          light.getWorldPosition(actualStartPosition.current);
          if (aimableLight(light)) {
            const targetPosition = light.target.getWorldPosition(
              new THREE.Vector3(),
            );
            startDirection.current
              .copy(targetPosition)
              .sub(actualStartPosition.current)
              .normalize();
            targetDistance.current = Math.max(
              0.1,
              actualStartPosition.current.distanceTo(targetPosition),
            );
          }
          const controls = get().controls as EditableOrbitControls | null;
          if (controls) {
            controlsEnabled.current = controls.enabled ?? true;
            controls.enabled = false;
          }
        }}
        onDrag={(_local, _deltaLocal, _world, deltaWorld) => {
          desiredMatrix.current
            .copy(dragStartMatrix.current)
            .premultiply(deltaWorld)
            .decompose(
              decomposedPosition.current,
              decomposedQuaternion.current,
              decomposedScale.current,
            );
          translatedLightPosition.current
            .copy(actualStartPosition.current)
            .add(decomposedPosition.current)
            .sub(anchorStartPosition.current);
          setWorldPosition(light, translatedLightPosition.current);
          if (aimableLight(light)) {
            const direction = startDirection.current
              .clone()
              .applyQuaternion(decomposedQuaternion.current)
              .normalize();
            const targetPosition = translatedLightPosition.current
              .clone()
              .addScaledVector(direction, targetDistance.current);
            setWorldPosition(light.target, targetPosition);
          }
          matrix.current.copy(desiredMatrix.current);
          invalidate();
        }}
        onDragEnd={() => {
          dragging.current = false;
          const update: Partial<EditableLight> = {
            position: vectorTuple(light.position),
          };
          if (aimableLight(light)) {
            update.target = vectorTuple(light.target.position);
          }
          onCommit(update);
          const controls = get().controls as EditableOrbitControls | null;
          if (controls && controlsEnabled.current !== undefined) {
            controls.enabled = controlsEnabled.current;
            controls.update?.();
          }
          controlsEnabled.current = undefined;
          invalidate();
        }}
        userData={{ lightingDebugHelper: true }}
      />
    </group>
  );
}

export function SceneLightingProbe() {
  const context = useLightingDebug();
  const scene = useThree((state) => state.scene);
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const runtimeLights = useRef(new Map<string, THREE.Light>());
  const helpers = useRef(new Map<string, THREE.Object3D>());
  const [, setRuntimeRevision] = useState(0);
  const baseline = useRef<{
    toneMapping: THREE.ToneMapping;
    exposure: number;
    environment: THREE.Texture | null;
    background: THREE.Color | THREE.Texture | null;
    environmentIntensity: number;
    backgroundIntensity: number;
    backgroundBlurriness: number;
    lights: Map<string, RuntimeLightBaseline>;
  } | null>(null);

  useEffect(() => {
    if (!context.enabled) return;
    const lightBaselines = new Map<string, RuntimeLightBaseline>();
    runtimeLights.current.clear();
    scene.traverse((object) => {
      if (!(object instanceof THREE.Light)) return;
      runtimeLights.current.set(object.uuid, object);
      lightBaselines.set(object.uuid, {
        light: object,
        visible: object.visible,
        color: object.color.clone(),
        intensity: object.intensity,
        position: object.position.clone(),
        quaternion: object.quaternion.clone(),
        castShadow: object.castShadow,
        targetPosition: aimableLight(object)
          ? object.target.position.clone()
          : null,
        angle: object instanceof THREE.SpotLight ? object.angle : null,
        penumbra: object instanceof THREE.SpotLight ? object.penumbra : null,
        distance:
          object instanceof THREE.PointLight || object instanceof THREE.SpotLight
            ? object.distance
            : null,
        decay:
          object instanceof THREE.PointLight || object instanceof THREE.SpotLight
            ? object.decay
            : null,
      });
    });
    baseline.current = {
      toneMapping: gl.toneMapping,
      exposure: gl.toneMappingExposure,
      environment: scene.environment,
      background: scene.background,
      environmentIntensity: scene.environmentIntensity,
      backgroundIntensity: scene.backgroundIntensity,
      backgroundBlurriness: scene.backgroundBlurriness,
      lights: lightBaselines,
    };
    context.registerScene(captureScene(scene, gl));

    return () => {
      const original = baseline.current;
      if (!original) return;
      gl.toneMapping = original.toneMapping;
      gl.toneMappingExposure = original.exposure;
      scene.environment = original.environment;
      scene.background = original.background;
      scene.environmentIntensity = original.environmentIntensity;
      scene.backgroundIntensity = original.backgroundIntensity;
      scene.backgroundBlurriness = original.backgroundBlurriness;
      helpers.current.forEach((helper) => {
        scene.remove(helper);
        disposeLightHelper(helper);
      });
      helpers.current.clear();
      runtimeLights.current.forEach((light, id) => {
        if (light.userData.lightingDebugAdded) {
          scene.remove(light);
          if (aimableLight(light)) scene.remove(light.target);
          return;
        }
        const saved = original.lights.get(id);
        if (!saved) return;
        light.visible = saved.visible;
        light.color.copy(saved.color);
        light.intensity = saved.intensity;
        light.position.copy(saved.position);
        light.quaternion.copy(saved.quaternion);
        light.castShadow = saved.castShadow;
        if (aimableLight(light) && saved.targetPosition) {
          light.target.position.copy(saved.targetPosition);
          light.target.updateMatrix();
          light.target.updateWorldMatrix(true, true);
        }
        if (light instanceof THREE.SpotLight) {
          light.angle = saved.angle ?? light.angle;
          light.penumbra = saved.penumbra ?? light.penumbra;
        }
        if (light instanceof THREE.PointLight || light instanceof THREE.SpotLight) {
          light.distance = saved.distance ?? light.distance;
          light.decay = saved.decay ?? light.decay;
        }
        light.updateMatrix();
        light.updateWorldMatrix(true, true);
      });
      runtimeLights.current.clear();
      invalidate();
    };
  }, [context.enabled, context.registerScene, gl, invalidate, scene]);

  const active =
    context.enabled && context.activeSceneId === scene.uuid && baseline.current;

  useEffect(() => {
    if (!active || !baseline.current) return;
    const settings = context.settings;
    const original = baseline.current;
    gl.toneMapping = TONE_MAPPING_BY_NAME[settings.toneMapping];
    gl.toneMappingExposure = settings.exposure;
    scene.environmentIntensity = settings.environmentIntensity;
    scene.backgroundIntensity = settings.backgroundIntensity;
    scene.backgroundBlurriness = settings.backgroundBlur;

    if (settings.hdri === "scene") scene.environment = original.environment;
    if (settings.hdri === "none") scene.environment = null;

    if (settings.backgroundMode === "scene") {
      scene.background = original.background;
    } else if (settings.backgroundMode === "transparent") {
      scene.background = null;
    } else if (settings.backgroundMode === "color") {
      scene.background = new THREE.Color(settings.backgroundColor);
    }

    invalidate();
  }, [active, context.settings, gl, invalidate, scene]);

  useEffect(() => {
    if (!active) return;
    const desiredIds = new Set(context.lights.map((entry) => entry.id));
    let runtimeChanged = false;

    context.lights.forEach((entry) => {
      let light = runtimeLights.current.get(entry.id);
      if (!light && entry.added) {
        light = createRuntimeLight(entry);
        scene.add(light);
        if (aimableLight(light)) {
          light.target.name = `${entry.name} target`;
          light.target.userData.lightingDebugHelper = true;
          scene.add(light.target);
        }
        runtimeLights.current.set(entry.id, light);
        runtimeChanged = true;
      }
      if (!light) return;
      applyEditableLight(light, entry, context.settings.lightMultiplier);

      const helper = helpers.current.get(entry.id);
      if (entry.helper && !helper) {
        const nextHelper = createLightHelper(
          light,
          context.snapshot?.scene.focusRadius ?? 5,
        );
        helpers.current.set(entry.id, nextHelper);
        scene.add(nextHelper);
      } else if (!entry.helper && helper) {
        scene.remove(helper);
        disposeLightHelper(helper);
        helpers.current.delete(entry.id);
      }
    });

    runtimeLights.current.forEach((light, id) => {
      if (!light.userData.lightingDebugAdded || desiredIds.has(id)) return;
      const helper = helpers.current.get(id);
      if (helper) {
        scene.remove(helper);
        disposeLightHelper(helper);
        helpers.current.delete(id);
      }
      scene.remove(light);
      if (aimableLight(light)) scene.remove(light.target);
      runtimeLights.current.delete(id);
      runtimeChanged = true;
    });

    if (runtimeChanged) setRuntimeRevision((revision) => revision + 1);
    invalidate();
  }, [active, context.lights, context.settings.lightMultiplier, invalidate, scene]);

  useFrame(() => {
    if (!active) return;
    helpers.current.forEach((helper, id) => {
      const light = runtimeLights.current.get(id);
      if (!light) return;
      const updatable = helper as THREE.Object3D & { update?: () => void };
      if (updatable.update) {
        updatable.update();
      } else {
        helper.position.copy(light.getWorldPosition(new THREE.Vector3()));
      }
    });
  });

  const selectedEntry = context.lights.find(
    (light) => light.id === context.selectedLightId,
  );
  const selectedRuntimeLight = selectedEntry
    ? runtimeLights.current.get(selectedEntry.id) ?? null
    : null;

  useEffect(() => {
    if (!active || !selectedEntry?.helper || !selectedRuntimeLight) return;
    invalidate();
    const frame = window.requestAnimationFrame(() => invalidate());
    return () => window.cancelAnimationFrame(frame);
  }, [active, invalidate, selectedEntry?.helper, selectedRuntimeLight]);

  if (!active) return null;
  return (
    <>
      {context.settings.hdri === "neutral" && (
        <Environment
          files="/Images/neutral.hdr"
          environmentIntensity={context.settings.environmentIntensity}
          background={context.settings.backgroundMode === "hdri"}
          backgroundIntensity={context.settings.backgroundIntensity}
          backgroundBlurriness={context.settings.backgroundBlur}
        />
      )}
      {selectedEntry?.helper && selectedRuntimeLight && (
        <LightTransformGizmo
          light={selectedRuntimeLight}
          entry={selectedEntry}
          focusCenter={
            context.snapshot?.scene.focusCenter ?? [0, 0, 0]
          }
          onCommit={(update) => context.updateLight(selectedEntry.id, update)}
        />
      )}
    </>
  );
}

declare global {
  interface Window {
    __LAST_LIGHTING_DEBUG_EXPORT__?: unknown;
  }
}
