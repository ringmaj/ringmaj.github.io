"use client";

import {
  createContext,
  type CSSProperties,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  FiChevronDown,
  FiRotateCcw,
  FiUpload,
} from "react-icons/fi";
import * as THREE from "three";

export type ViewerMode = "dark" | "light";

export type TextureMapKey =
  | "map"
  | "normalMap"
  | "roughnessMap"
  | "metalnessMap"
  | "emissiveMap"
  | "aoMap"
  | "bumpMap"
  | "displacementMap";

interface BaseTextureShaderUniforms {
  brightness: { value: number };
  contrast: { value: number };
}

export interface ViewerMaterialRecord {
  id: string;
  label: string;
  material: THREE.MeshStandardMaterial;
  original: THREE.MeshStandardMaterial;
  usage: number;
  supportsDisplacement: boolean;
  autoBumpFromDisplacement: THREE.Texture | null;
  ownedTextures: Set<THREE.Texture>;
  textureOverrides: Map<TextureMapKey, THREE.Texture>;
  baseTextureBrightness: number;
  baseTextureContrast: number;
  baseTextureShaderUniforms: Set<BaseTextureShaderUniforms>;
  sourceOnBeforeCompile: THREE.Material["onBeforeCompile"];
  sourceCustomProgramCacheKey: THREE.Material["customProgramCacheKey"];
}

export interface ViewerShadowSettings {
  enabled: boolean;
  opacity: number;
  softness: number;
}

const MAP_OPTIONS: Array<{ key: TextureMapKey; label: string }> = [
  { key: "map", label: "Base texture" },
  { key: "normalMap", label: "Normal map" },
  { key: "roughnessMap", label: "Roughness map" },
  { key: "metalnessMap", label: "Metalness map" },
  { key: "emissiveMap", label: "Emissive map" },
  { key: "aoMap", label: "Occlusion map" },
  { key: "bumpMap", label: "Bump map" },
  { key: "displacementMap", label: "Displacement map" },
];

const MaterialEditorLightContext = createContext(false);

const BASE_TEXTURE_FRAGMENT = THREE.ShaderChunk.map_fragment.replace(
  "diffuseColor *= sampledDiffuseColor;",
  `
  sampledDiffuseColor.rgb = max(
    vec3( 0.0 ),
    ( sampledDiffuseColor.rgb - vec3( 0.5 ) ) * materialEditorMapContrast + vec3( 0.5 )
  );
  sampledDiffuseColor.rgb *= materialEditorMapBrightness;
  diffuseColor *= sampledDiffuseColor;
  `,
);

export function installBaseTextureAdjustments(record: ViewerMaterialRecord) {
  const { material } = record;
  material.onBeforeCompile = (shader, renderer) => {
    record.sourceOnBeforeCompile.call(material, shader, renderer);
    const brightness = { value: record.baseTextureBrightness };
    const contrast = { value: record.baseTextureContrast };
    shader.uniforms.materialEditorMapBrightness = brightness;
    shader.uniforms.materialEditorMapContrast = contrast;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <map_pars_fragment>",
        `#include <map_pars_fragment>
uniform float materialEditorMapBrightness;
uniform float materialEditorMapContrast;`,
      )
      .replace("#include <map_fragment>", BASE_TEXTURE_FRAGMENT);
    record.baseTextureShaderUniforms.add({ brightness, contrast });
  };
  material.customProgramCacheKey = () =>
    `${record.sourceCustomProgramCacheKey.call(material)}|base-texture-adjustments-v1`;
  material.needsUpdate = true;
}

function setBaseTextureAdjustments(
  record: ViewerMaterialRecord,
  brightness: number,
  contrast: number,
) {
  record.baseTextureBrightness = brightness;
  record.baseTextureContrast = contrast;
  record.baseTextureShaderUniforms.forEach((uniforms) => {
    uniforms.brightness.value = brightness;
    uniforms.contrast.value = contrast;
  });
}

const MATERIAL_EDITOR_SLIDER_CSS = `
  .material-editor-slider {
    -webkit-appearance: none;
    appearance: none;
    margin: 0;
    border: 0;
    outline: none;
    background:
      linear-gradient(
        to right,
        var(--slider-fill) 0,
        var(--slider-fill) var(--slider-progress),
        var(--slider-track) var(--slider-progress),
        var(--slider-track) 100%
      ) center / 100% 2px no-repeat;
  }

  .material-editor-slider::-webkit-slider-runnable-track {
    height: 2px;
    border: 0;
    background: transparent;
  }

  .material-editor-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 11px;
    height: 11px;
    margin-top: -4.5px;
    border: 1px solid #c7c7c7;
    border-radius: 999px;
    background: radial-gradient(circle, #252525 0 3px, #ffffff 3.2px 100%);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
  }

  .material-editor-slider::-moz-range-track {
    height: 2px;
    border: 0;
    background: var(--slider-track);
  }

  .material-editor-slider::-moz-range-progress {
    height: 2px;
    background: var(--slider-fill);
  }

  .material-editor-slider::-moz-range-thumb {
    width: 9px;
    height: 9px;
    border: 1px solid #c7c7c7;
    border-radius: 999px;
    background: radial-gradient(circle, #252525 0 3px, #ffffff 3.2px 100%);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
  }

  .material-editor-slider:focus-visible::-webkit-slider-thumb {
    box-shadow:
      0 0 0 2px #ffffff,
      0 0 0 4px rgba(37, 37, 37, 0.22);
  }

  .material-editor-slider:disabled {
    cursor: default;
  }

  .material-editor-scroll {
    --material-scroll-track: #fbfbfb;
    --material-scroll-thumb: #b7b7b7;
    scrollbar-color: var(--material-scroll-thumb) var(--material-scroll-track);
    scrollbar-width: thin;
  }

  .material-editor-scroll[data-viewer-theme="dark"] {
    --material-scroll-track: #17181a;
    --material-scroll-thumb: #4c4e52;
  }

  .material-editor-scroll::-webkit-scrollbar {
    width: 6px;
  }

  .material-editor-scroll::-webkit-scrollbar-track {
    background: var(--material-scroll-track);
  }

  .material-editor-scroll::-webkit-scrollbar-thumb {
    min-height: 36px;
    border: 1px solid var(--material-scroll-track);
    border-radius: 999px;
    background: var(--material-scroll-thumb);
  }

  .material-editor-scroll::-webkit-scrollbar-thumb:hover {
    background: #f97316;
  }
`;

function useLightEditor() {
  return useContext(MaterialEditorLightContext);
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const decimals = THREE.MathUtils.clamp(
    Math.ceil(-Math.log10(Math.max(step, Number.EPSILON))),
    0,
    4,
  );
  const light = useLightEditor();
  const progress = THREE.MathUtils.clamp(
    ((value - min) / Math.max(max - min, Number.EPSILON)) * 100,
    0,
    100,
  );
  const sliderStyle = {
    "--slider-progress": `${progress}%`,
    "--slider-fill": light ? "#252525" : "#f97316",
    "--slider-track": light ? "#d8d8d8" : "rgba(255,255,255,0.28)",
  } as CSSProperties;

  return (
    <label
      className={`grid grid-cols-[4.25rem_minmax(0,1fr)_2.65rem] items-center gap-2 py-1 text-[0.58rem] uppercase tracking-[0.16em] ${
        light ? "text-neutral-600" : "text-white/65"
      } ${
        disabled ? "opacity-35" : ""
      }`}
    >
      <span className="whitespace-nowrap">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        style={sliderStyle}
        className="material-editor-slider h-4 min-w-0 w-full cursor-default"
        onInput={(event) => onChange(Number(event.currentTarget.value))}
      />
      <output
        className={`flex h-[1.45rem] items-center justify-center rounded-[0.45rem] border px-1 text-center font-sans text-[0.62rem] tracking-normal ${
          light
            ? "border-neutral-200 bg-neutral-100 text-neutral-700"
            : "border-white/10 bg-white/5 text-white/80"
        }`}
      >
        {value.toFixed(decimals)}
      </output>
    </label>
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value.toUpperCase());
  const light = useLightEditor();

  useEffect(() => {
    setDraft(value.toUpperCase());
  }, [value]);

  const updateDraft = (nextValue: string) => {
    setDraft(nextValue);
    if (/^#[0-9a-f]{6}$/i.test(nextValue)) onChange(nextValue);
  };

  return (
    <label
      className={`flex items-center justify-between gap-3 py-1.5 text-[0.68rem] ${
        light ? "text-neutral-600" : "text-white/65"
      }`}
    >
      <span className="uppercase tracking-[0.12em]">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="text"
          aria-label={`${label} hex color`}
          value={draft}
          maxLength={7}
          spellCheck={false}
          className={`h-8 w-[5.4rem] cursor-default border px-2 text-center font-mono text-[0.65rem] uppercase outline-none focus:border-orange-400 ${
            light
              ? "rounded-lg border-neutral-200 bg-white text-neutral-700"
              : "border-white/15 bg-white/5 text-white/70"
          }`}
          onChange={(event) => updateDraft(event.target.value)}
          onBlur={() => {
            if (!/^#[0-9a-f]{6}$/i.test(draft)) {
              setDraft(value.toUpperCase());
            }
          }}
        />
        <input
          type="color"
          aria-label={`${label} color picker`}
          value={value}
          className={`h-8 w-11 cursor-default rounded-lg border bg-transparent p-0.5 ${
            light ? "border-neutral-300" : "border-white/15"
          }`}
          onChange={(event) => updateDraft(event.target.value)}
        />
      </span>
    </label>
  );
}

function SwitchIndicator({
  checked,
  disabled = false,
}: {
  checked: boolean;
  disabled?: boolean;
}) {
  const light = useLightEditor();

  return (
    <span
      aria-hidden="true"
      className={`relative block h-5 w-9 shrink-0 overflow-hidden rounded-full border transition-colors ${
        checked
          ? light
            ? "border-neutral-900 bg-neutral-900"
            : "border-orange-300 bg-orange-500"
          : light
            ? "border-neutral-300 bg-neutral-200"
            : "border-white/20 bg-white/10"
      } ${disabled ? "opacity-40" : ""}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 size-3.5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </span>
  );
}

function Toggle({
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
  const light = useLightEditor();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`flex w-full cursor-default items-center justify-between py-1.5 text-left text-[0.68rem] uppercase tracking-[0.12em] disabled:opacity-35 ${
        light ? "text-neutral-600" : "text-white/65"
      }`}
      onClick={() => onChange(!checked)}
    >
      <span>{label}</span>
      <SwitchIndicator checked={checked} />
    </button>
  );
}

function EditorSection({
  title,
  children,
  open = false,
}: {
  title: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  const [expanded, setExpanded] = useState(open);
  const light = useLightEditor();

  return (
    <details
      open={expanded}
      className={`group border-t ${
        light ? "border-neutral-200" : "border-white/10"
      }`}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary
        className={`flex cursor-default list-none items-center justify-between py-3.5 text-[0.64rem] uppercase tracking-[0.2em] [&::-webkit-details-marker]:hidden ${
          light
            ? "font-medium text-neutral-400"
            : "font-bold text-white/80"
        }`}
      >
        {title}
        <FiChevronDown className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="pb-3">{children}</div>
    </details>
  );
}

function getMap(
  material: THREE.MeshStandardMaterial,
  key: TextureMapKey,
) {
  return material[key];
}

function getFirstMap(material: THREE.MeshStandardMaterial) {
  for (const { key } of MAP_OPTIONS) {
    const texture = getMap(material, key);
    if (texture) return texture;
  }
  return null;
}

async function createUploadedTexture(
  file: File,
  key: TextureMapKey,
) {
  const bitmap = await createImageBitmap(file);
  const maxDimension = 2048;
  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Canvas rendering is unavailable.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = file.name;
  texture.flipY = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace =
    key === "map" || key === "emissiveMap"
      ? THREE.SRGBColorSpace
      : THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function TextureMapControl({
  mapKey,
  label,
  texture,
  enabled,
  busy,
  onUpload,
  onToggle,
}: {
  mapKey: TextureMapKey;
  label: string;
  texture: THREE.Texture | null;
  enabled: boolean;
  busy: boolean;
  onUpload: (key: TextureMapKey, file: File) => void;
  onToggle: (enabled: boolean) => void;
}) {
  const light = useLightEditor();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = previewRef.current;
    const context = canvas?.getContext("2d");
    const image = texture?.image as
      | (CanvasImageSource & {
          width?: number;
          height?: number;
          naturalWidth?: number;
          naturalHeight?: number;
          videoWidth?: number;
          videoHeight?: number;
        })
      | undefined;
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!image) return;

    const drawPreview = () => {
      const width =
        image.naturalWidth ?? image.videoWidth ?? image.width ?? 0;
      const height =
        image.naturalHeight ?? image.videoHeight ?? image.height ?? 0;
      if (!width || !height) return;

      const cropSize = Math.min(width, height);
      const sourceX = (width - cropSize) / 2;
      const sourceY = (height - cropSize) / 2;
      try {
        context.drawImage(
          image,
          sourceX,
          sourceY,
          cropSize,
          cropSize,
          0,
          0,
          canvas.width,
          canvas.height,
        );
      } catch {
        // Some externally supplied texture sources cannot be drawn to 2D.
      }
    };

    if (image instanceof HTMLImageElement && !image.complete) {
      image.addEventListener("load", drawPreview, { once: true });
      return () => image.removeEventListener("load", drawPreview);
    }

    drawPreview();
  }, [texture, texture?.version]);

  const chooseTexture = () => inputRef.current?.click();
  const dimmed = !enabled;

  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_2rem_2.25rem] items-center gap-1.5 py-1"
    >
      <span
        className={`truncate text-[0.62rem] uppercase tracking-[0.12em] transition-opacity ${
          light ? "text-neutral-600" : "text-white/65"
        } ${dimmed ? "opacity-40" : ""}`}
      >
        {label}
      </span>
      <button
        type="button"
        aria-label={`${texture ? "Replace" : "Upload"} ${label}`}
        title={`${texture ? "Replace" : "Upload"} ${label}`}
        disabled={busy}
        className={`relative size-8 cursor-default overflow-hidden border transition-opacity hover:border-orange-400 disabled:cursor-wait ${
          light
            ? "rounded-[0.4rem] border-neutral-200 bg-neutral-100"
            : "border-white/15 bg-white/5"
        } ${dimmed ? "opacity-40 grayscale" : ""}`}
        onClick={chooseTexture}
      >
        <canvas
          ref={previewRef}
          width={64}
          height={64}
          aria-hidden="true"
          className={`size-full ${texture ? "block" : "hidden"}`}
        />
        {!texture && (
          <span
            aria-hidden="true"
            className={`absolute inset-0 grid place-items-center text-xs ${
              light ? "text-neutral-400" : "text-white/35"
            }`}
          >
            <FiUpload />
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 animate-pulse bg-orange-400/45" />
        )}
      </button>
      <button
        type="button"
        role="switch"
        aria-label={`${label} enabled`}
        aria-checked={enabled}
        disabled={!texture || busy}
        className="justify-self-end cursor-default disabled:cursor-default"
        onClick={() => onToggle(!enabled)}
      >
        <SwitchIndicator checked={enabled} disabled={!texture} />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        aria-label={`Choose ${label} image`}
        disabled={busy}
        className="sr-only"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) onUpload(mapKey, file);
        }}
      />
    </div>
  );
}

export default function MaterialEditor({
  materials,
  selectedMaterialId,
  viewerMode,
  backgroundColor,
  shadow,
  onViewerModeChange,
  onSelectedMaterialChange,
  onBackgroundColorChange,
  onShadowChange,
  onMaterialChange,
  className = "",
}: {
  materials: ViewerMaterialRecord[];
  selectedMaterialId: string | null;
  viewerMode: ViewerMode;
  backgroundColor: string;
  shadow: ViewerShadowSettings;
  onViewerModeChange: (mode: ViewerMode) => void;
  onSelectedMaterialChange: (materialId: string) => void;
  onBackgroundColorChange: (color: string) => void;
  onShadowChange: (settings: ViewerShadowSettings) => void;
  onMaterialChange: (rebuildShadow?: boolean) => void;
  className?: string;
}) {
  const [uploadingKeys, setUploadingKeys] = useState<Set<TextureMapKey>>(
    new Set(),
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [, setRevision] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const selected =
    materials.find((record) => record.id === selectedMaterialId) ??
    materials[0];

  const refresh = (needsUpdate = false, rebuildShadow = false) => {
    if (!selected) return;
    if (needsUpdate) selected.material.needsUpdate = true;
    setRevision((revision) => revision + 1);
    onMaterialChange(rebuildShadow);
  };

  const disposeTextureOverrides = (record: ViewerMaterialRecord) => {
    record.ownedTextures.forEach((texture) => texture.dispose());
    record.ownedTextures.clear();
    record.textureOverrides.clear();
    record.autoBumpFromDisplacement = null;
  };

  const releaseTextureOverride = (
    record: ViewerMaterialRecord,
    key: TextureMapKey,
  ) => {
    const texture = record.textureOverrides.get(key);
    if (!texture) return;
    texture.dispose();
    record.ownedTextures.delete(texture);
    record.textureOverrides.delete(key);
    if (record.autoBumpFromDisplacement === texture) {
      record.autoBumpFromDisplacement = null;
    }
  };

  const resetSelected = () => {
    if (!selected) return;
    disposeTextureOverrides(selected);
    selected.material.copy(selected.original);
    setBaseTextureAdjustments(selected, 1, 1);
    installBaseTextureAdjustments(selected);
    selected.material.needsUpdate = true;
    refresh(false, true);
  };

  const resetAll = () => {
    materials.forEach((record) => {
      disposeTextureOverrides(record);
      record.material.copy(record.original);
      setBaseTextureAdjustments(record, 1, 1);
      installBaseTextureAdjustments(record);
      record.material.needsUpdate = true;
    });
    setRevision((revision) => revision + 1);
    onMaterialChange(true);
  };

  const setMapEnabled = (key: TextureMapKey, enabled: boolean) => {
    if (!selected) return;
    const available =
      selected.textureOverrides.get(key) ?? getMap(selected.original, key);
    if (!available) return;
    selected.material[key] = enabled
      ? available
      : null;
    refresh(true);
  };

  const setTextureRepeat = (repeat: number) => {
    if (!selected) return;

    let changed = false;
    for (const { key } of MAP_OPTIONS) {
      const current = getMap(selected.material, key);
      if (!current) continue;

      let editable = current;
      if (!selected.ownedTextures.has(current)) {
        releaseTextureOverride(selected, key);
        editable = current.clone();
        selected.ownedTextures.add(editable);
        selected.textureOverrides.set(key, editable);
        selected.material[key] = editable;
      }

      editable.wrapS = THREE.RepeatWrapping;
      editable.wrapT = THREE.RepeatWrapping;
      editable.repeat.set(repeat, repeat);
      editable.needsUpdate = true;
      changed = true;
    }

    if (changed) refresh();
  };

  const uploadTexture = async (key: TextureMapKey, file: File) => {
    if (!selected) return;
    const record = selected;
    setUploadError(null);
    setUploadingKeys((current) => new Set(current).add(key));

    try {
      const texture = await createUploadedTexture(file, key);
      if (!mounted.current) {
        texture.dispose();
        return;
      }

      const currentTexture = getMap(record.material, key);
      const repeat = currentTexture?.repeat.x ?? 1;
      texture.repeat.set(repeat, repeat);

      if (
        key === "displacementMap" &&
        record.autoBumpFromDisplacement
      ) {
        releaseTextureOverride(record, "bumpMap");
        record.material.bumpMap = null;
      }
      releaseTextureOverride(record, key);
      record.ownedTextures.add(texture);
      record.textureOverrides.set(key, texture);
      record.material[key] = texture;
      if (key === "displacementMap") {
        record.material.displacementScale = 0.004;
        record.material.displacementBias = 0;

        // Fine PCB traces need fragment-level height detail in addition to
        // bounded vertex displacement. Reuse the uploaded height source as a
        // separate bump texture unless the user already supplied one.
        if (!record.material.bumpMap) {
          const bumpTexture = texture.clone();
          bumpTexture.name = `${texture.name || "Displacement"} · bump detail`;
          bumpTexture.needsUpdate = true;
          record.ownedTextures.add(bumpTexture);
          record.textureOverrides.set("bumpMap", bumpTexture);
          record.material.bumpMap = bumpTexture;
          record.material.bumpScale = 0.08;
          record.autoBumpFromDisplacement = bumpTexture;
        }
      }
      record.material.needsUpdate = true;
      setRevision((revision) => revision + 1);
      onMaterialChange();
    } catch {
      if (mounted.current) {
        setUploadError(
          "That image could not be decoded. Try PNG, JPEG, WebP, or AVIF.",
        );
      }
    } finally {
      if (mounted.current) {
        setUploadingKeys((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      }
    }
  };

  const material = selected?.material;
  const original = selected?.original;
  const physical =
    material instanceof THREE.MeshPhysicalMaterial ? material : null;
  const firstTexture = material ? getFirstMap(material) : null;
  const light = viewerMode === "light";

  return (
    <MaterialEditorLightContext.Provider value={light}>
      <style>{MATERIAL_EDITOR_SLIDER_CSS}</style>
      <aside
        data-page-navigation-ignore
        data-viewer-theme={viewerMode}
        className={`material-editor-scroll overflow-x-hidden overflow-y-auto ${
          light
            ? "border-[#e6e6e6] bg-[#fbfbfb] text-neutral-950"
            : "border-white/15 bg-[#17181a] text-white"
        } ${className}`}
      >
      <div
        aria-hidden="true"
        className={`pointer-events-none sticky top-0 z-20 -mb-[4.75rem] hidden h-[4.75rem] lg:block ${
          light ? "bg-[#fbfbfb]" : "bg-[#17181a]"
        }`}
      />
      <div className="pb-8 pl-4 pr-2 pt-5 lg:pt-24">
        <div className="mb-3">
          <p
            className={`text-[0.6rem] font-bold uppercase tracking-[0.22em] ${
              light ? "text-neutral-400" : "text-orange-300"
            }`}
          >
            Material editor
          </p>
          <p
            className={`mt-1 text-xs ${
              light ? "text-neutral-500" : "text-white/45"
            }`}
          >
            Click a model surface to select its material.
          </p>
        </div>

        {selected && (
          <label className="block pb-3" aria-live="polite">
            <span
              className={`block text-[0.6rem] font-medium uppercase tracking-[0.2em] ${
                light ? "text-neutral-400" : "text-white/45"
              }`}
            >
              Selected material
            </span>
            <span className="relative mt-1 block">
              <select
                aria-label="Selected material"
                value={selected.id}
                className={`h-8 w-full appearance-none cursor-default bg-transparent pr-8 text-[0.8rem] font-semibold outline-none ${
                  light ? "text-neutral-800" : "text-white"
                }`}
                onChange={(event) =>
                  onSelectedMaterialChange(event.target.value)
                }
              >
                {materials.map((record) => (
                  <option
                    key={record.id}
                    value={record.id}
                    className={
                      light
                        ? "bg-white text-neutral-900"
                        : "bg-neutral-900 text-white"
                    }
                  >
                    {record.label}
                  </option>
                ))}
              </select>
              <FiChevronDown
                aria-hidden="true"
                className={`pointer-events-none absolute right-0 top-2 text-sm ${
                  light ? "text-neutral-500" : "text-white/60"
                }`}
              />
            </span>
          </label>
        )}

        <EditorSection title="Viewer" open>
          <Toggle
            label="Light mode"
            checked={viewerMode === "light"}
            onChange={(light) =>
              onViewerModeChange(light ? "light" : "dark")
            }
          />
          <ColorControl
            label="Background"
            value={backgroundColor}
            onChange={onBackgroundColorChange}
          />
        </EditorSection>

        {selected && material && original ? (
          <>
            <EditorSection title="Base color" open>
              <ColorControl
                label="Factor"
                value={`#${material.color.getHexString()}`}
                onChange={(value) => {
                  material.color.set(value);
                  refresh();
                }}
              />
              <Toggle
                label="Texture"
                checked={Boolean(material.map)}
                disabled={
                  !original.map &&
                  !selected.textureOverrides.has("map")
                }
                onChange={(checked) => setMapEnabled("map", checked)}
              />
              <Slider
                label="Brightness"
                min={0}
                max={2}
                step={0.01}
                value={selected.baseTextureBrightness}
                disabled={!material.map}
                onChange={(value) => {
                  setBaseTextureAdjustments(
                    selected,
                    value,
                    selected.baseTextureContrast,
                  );
                  refresh();
                }}
              />
              <Slider
                label="Contrast"
                min={0}
                max={2}
                step={0.01}
                value={selected.baseTextureContrast}
                disabled={!material.map}
                onChange={(value) => {
                  setBaseTextureAdjustments(
                    selected,
                    selected.baseTextureBrightness,
                    value,
                  );
                  refresh();
                }}
              />
            </EditorSection>

            <EditorSection title="Surface response" open>
              <Slider
                label="Metal"
                min={0}
                max={1}
                step={0.01}
                value={material.metalness}
                onChange={(value) => {
                  material.metalness = value;
                  refresh();
                }}
              />
              <Slider
                label="Rough"
                min={0}
                max={1}
                step={0.01}
                value={material.roughness}
                onChange={(value) => {
                  material.roughness = value;
                  refresh();
                }}
              />
              <Slider
                label="Env"
                min={0}
                max={3}
                step={0.05}
                value={material.envMapIntensity}
                onChange={(value) => {
                  material.envMapIntensity = value;
                  refresh();
                }}
              />
            </EditorSection>

            <EditorSection title="Texture maps" open>
              <div className="pb-2">
                {MAP_OPTIONS.filter(
                  ({ key }) =>
                    key !== "displacementMap" ||
                    selected.supportsDisplacement,
                ).map(({ key, label }) => {
                  const availableTexture =
                    selected.textureOverrides.get(key) ??
                    getMap(original, key);
                  return (
                    <TextureMapControl
                      key={key}
                      mapKey={key}
                      label={label}
                      texture={availableTexture}
                      enabled={Boolean(getMap(material, key))}
                      busy={uploadingKeys.has(key)}
                      onUpload={uploadTexture}
                      onToggle={(checked) =>
                        setMapEnabled(key, checked)
                      }
                    />
                  );
                })}
              </div>
              {uploadError && (
                <p
                  role="alert"
                  className={`pb-2 text-[0.65rem] ${
                    light ? "text-red-600" : "text-red-300"
                  }`}
                >
                  {uploadError}
                </p>
              )}
              <Slider
                label="Repeat"
                min={0.25}
                max={8}
                step={0.05}
                value={firstTexture?.repeat.x ?? 1}
                disabled={!firstTexture}
                onChange={setTextureRepeat}
              />
              <p
                className={`pb-1 text-[0.6rem] leading-relaxed ${
                  light ? "text-neutral-400" : "text-white/30"
                }`}
              >
                Higher repeat values make the texture pattern smaller.
              </p>
              {material.normalMap && (
                <Slider
                  label="Normal"
                  min={0}
                  max={5}
                  step={0.05}
                  value={material.normalScale.x}
                  onChange={(value) => {
                    const ySign =
                      Math.sign(material.normalScale.y) ||
                      Math.sign(original.normalScale.y) ||
                      1;
                    material.normalScale.set(value, value * ySign);
                    refresh();
                  }}
                />
              )}
              {material.bumpMap && (
                <Slider
                  label="Bump"
                  min={-10}
                  max={10}
                  step={0.05}
                  value={material.bumpScale}
                  onChange={(value) => {
                    material.bumpScale = value;
                    refresh();
                  }}
                />
              )}
              {selected.supportsDisplacement &&
                material.displacementMap && (
                  <>
                    <Slider
                      label="Disp"
                      min={-0.02}
                      max={0.02}
                      step={0.0005}
                      value={material.displacementScale}
                      onChange={(value) => {
                        material.displacementScale = value;
                        refresh();
                      }}
                    />
                    <Slider
                      label="Bias"
                      min={-0.02}
                      max={0.02}
                      step={0.0005}
                      value={material.displacementBias}
                      onChange={(value) => {
                        material.displacementBias = value;
                        refresh();
                      }}
                    />
                  </>
                )}
            </EditorSection>

            <EditorSection title="Emissive">
              <ColorControl
                label="Color"
                value={`#${material.emissive.getHexString()}`}
                onChange={(value) => {
                  material.emissive.set(value);
                  refresh();
                }}
              />
              <Slider
                label="Strength"
                min={0}
                max={8}
                step={0.05}
                value={material.emissiveIntensity}
                onChange={(value) => {
                  material.emissiveIntensity = value;
                  refresh();
                }}
              />
            </EditorSection>

            {physical && (
              <EditorSection title="Physical">
                <Slider
                  label="Clearcoat"
                  min={0}
                  max={1}
                  step={0.01}
                  value={physical.clearcoat}
                  onChange={(value) => {
                    physical.clearcoat = value;
                    refresh();
                  }}
                />
                <Slider
                  label="Coat rough"
                  min={0}
                  max={1}
                  step={0.01}
                  value={physical.clearcoatRoughness}
                  onChange={(value) => {
                    physical.clearcoatRoughness = value;
                    refresh();
                  }}
                />
                <Slider
                  label="Transmit"
                  min={0}
                  max={1}
                  step={0.01}
                  value={physical.transmission}
                  onChange={(value) => {
                    physical.transmission = value;
                    refresh();
                  }}
                />
                <Slider
                  label="IOR"
                  min={1}
                  max={2.5}
                  step={0.01}
                  value={physical.ior}
                  onChange={(value) => {
                    physical.ior = value;
                    refresh();
                  }}
                />
              </EditorSection>
            )}

            <EditorSection title="Display">
              <Slider
                label="Opacity"
                min={0}
                max={1}
                step={0.01}
                value={material.opacity}
                onChange={(value) => {
                  material.opacity = value;
                  material.transparent =
                    value < 0.999 || selected.original.transparent;
                  refresh(true);
                }}
              />
              <Toggle
                label="Wireframe"
                checked={material.wireframe}
                onChange={(checked) => {
                  material.wireframe = checked;
                  refresh(true);
                }}
              />
              <Toggle
                label="Double sided"
                checked={material.side === THREE.DoubleSide}
                onChange={(checked) => {
                  material.side = checked
                    ? THREE.DoubleSide
                    : selected.original.side;
                  refresh(true);
                }}
              />
              <Toggle
                label="Flat shading"
                checked={material.flatShading}
                onChange={(checked) => {
                  material.flatShading = checked;
                  refresh(true);
                }}
              />
            </EditorSection>

            <div
              className={`grid grid-cols-2 gap-2 border-t pt-4 ${
                light ? "border-neutral-200" : "border-white/10"
              }`}
            >
              <button
                type="button"
                className={`flex h-9 cursor-default items-center justify-center gap-2 border text-[0.62rem] font-bold uppercase tracking-[0.12em] hover:border-orange-400 ${
                  light
                    ? "rounded-lg border-neutral-200 bg-neutral-100 text-neutral-600 hover:text-neutral-950"
                    : "border-white/15 bg-white/5 text-white/70 hover:text-white"
                }`}
                onClick={resetSelected}
              >
                <FiRotateCcw /> Material
              </button>
              <button
                type="button"
                className={`flex h-9 cursor-default items-center justify-center gap-2 border text-[0.62rem] font-bold uppercase tracking-[0.12em] hover:border-orange-400 ${
                  light
                    ? "rounded-lg border-neutral-200 bg-neutral-100 text-neutral-600 hover:text-neutral-950"
                    : "border-white/15 bg-white/5 text-white/70 hover:text-white"
                }`}
                onClick={resetAll}
              >
                <FiRotateCcw /> Reset all
              </button>
            </div>
          </>
        ) : (
          <div
            className={`border p-4 text-xs leading-relaxed ${
              light
                ? "border-neutral-200 bg-neutral-50 text-neutral-500"
                : "border-white/10 bg-white/5 text-white/45"
            }`}
          >
            No editable PBR materials were found on this object.
          </div>
        )}

        <EditorSection title="Contact shadow" open>
          <Toggle
            label="Enabled"
            checked={shadow.enabled}
            onChange={(enabled) => onShadowChange({ ...shadow, enabled })}
          />
          <Slider
            label="Opacity"
            min={0}
            max={1}
            step={0.01}
            value={shadow.opacity}
            onChange={(opacity) => onShadowChange({ ...shadow, opacity })}
          />
          <Slider
            label="Softness"
            min={0.5}
            max={6}
            step={0.1}
            value={shadow.softness}
            onChange={(softness) =>
              onShadowChange({ ...shadow, softness })
            }
          />
        </EditorSection>
        </div>
      </aside>
    </MaterialEditorLightContext.Provider>
  );
}
