"use client";

import {
  createContext,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ContactShadows, useGLTF } from "@react-three/drei";
import {
  Canvas,
  type ThreeEvent,
  useFrame,
  useThree,
} from "@react-three/fiber";
import { EffectComposer, Outline } from "@react-three/postprocessing";
import { FiSearch, FiSliders, FiX } from "react-icons/fi";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";
import MaterialEditor, {
  type TextureMapKey,
  type ViewerMaterialRecord,
  type ViewerMode,
  type ViewerShadowSettings,
} from "./MaterialEditor";
import { isPortfolioDebugMode } from "./debugMode";
import { applyModelMaterialOverride } from "./modelMaterialOverrides";
import NeutralEnvironment from "./Scenes/NeutralEnvironment";
import SmoothOrbitControls from "./Scenes/SmoothOrbitControls";
import { ScenePositionProbe } from "./PositionInfo";
import { SceneKeyframingProbe } from "./Keyframing";

type InspectableResolver = (
  root: THREE.Object3D,
  hit: THREE.Object3D,
) => THREE.Object3D | null;

interface ObjectSelection {
  label: string;
  path: number[];
}

interface ViewerSceneData {
  materials: ViewerMaterialRecord[];
  shadowY: number;
  shadowScale: number;
}

const INITIAL_VIEWER_SCENE: ViewerSceneData = {
  materials: [],
  shadowY: -1.2,
  shadowScale: 6,
};

const MATERIAL_DEBUG_HOLD_MS = 850;
const DEBUG_TEXTURE_KEYS: TextureMapKey[] = [
  "map",
  "normalMap",
  "roughnessMap",
  "metalnessMap",
  "emissiveMap",
  "aoMap",
  "bumpMap",
];

function debugNumber(value: number) {
  return Number(value.toFixed(6));
}

function materialSideName(side: THREE.Side) {
  if (side === THREE.BackSide) return "BackSide";
  if (side === THREE.DoubleSide) return "DoubleSide";
  return "FrontSide";
}

function serializeDebugTexture(
  texture: THREE.Texture | null,
  overridden = false,
) {
  if (!texture) return { enabled: false };
  const image = texture.image as
    | {
        width?: number;
        height?: number;
        naturalWidth?: number;
        naturalHeight?: number;
        videoWidth?: number;
        videoHeight?: number;
      }
    | undefined;

  return {
    enabled: true,
    name: texture.name || null,
    source: texture instanceof THREE.CanvasTexture
      ? "uploaded"
      : overridden
        ? "edited-clone"
        : "original",
    dimensions: image
      ? {
          width:
            image.naturalWidth ?? image.videoWidth ?? image.width ?? null,
          height:
            image.naturalHeight ?? image.videoHeight ?? image.height ?? null,
        }
      : null,
    repeat: [debugNumber(texture.repeat.x), debugNumber(texture.repeat.y)],
    offset: [debugNumber(texture.offset.x), debugNumber(texture.offset.y)],
    center: [debugNumber(texture.center.x), debugNumber(texture.center.y)],
    rotation: debugNumber(texture.rotation),
    wrapS: texture.wrapS,
    wrapT: texture.wrapT,
    flipY: texture.flipY,
    colorSpace: texture.colorSpace,
    channel: texture.channel,
    mapping: texture.mapping,
    minFilter: texture.minFilter,
    magFilter: texture.magFilter,
    anisotropy: texture.anisotropy,
    generateMipmaps: texture.generateMipmaps,
    premultiplyAlpha: texture.premultiplyAlpha,
    unpackAlignment: texture.unpackAlignment,
  };
}

function serializeDebugMaterial(material: THREE.MeshStandardMaterial) {
  const physical =
    material instanceof THREE.MeshPhysicalMaterial ? material : null;
  return {
    type: material.type,
    name: material.name || null,
    color: `#${material.color.getHexString()}`,
    metalness: debugNumber(material.metalness),
    roughness: debugNumber(material.roughness),
    envMapIntensity: debugNumber(material.envMapIntensity),
    normalScale: [
      debugNumber(material.normalScale.x),
      debugNumber(material.normalScale.y),
    ],
    bumpScale: debugNumber(material.bumpScale),
    emissive: `#${material.emissive.getHexString()}`,
    emissiveIntensity: debugNumber(material.emissiveIntensity),
    opacity: debugNumber(material.opacity),
    transparent: material.transparent,
    alphaTest: debugNumber(material.alphaTest),
    alphaHash: material.alphaHash,
    side: materialSideName(material.side),
    wireframe: material.wireframe,
    flatShading: material.flatShading,
    depthTest: material.depthTest,
    depthWrite: material.depthWrite,
    colorWrite: material.colorWrite,
    toneMapped: material.toneMapped,
    visible: material.visible,
    physical: physical
      ? {
          clearcoat: debugNumber(physical.clearcoat),
          clearcoatRoughness: debugNumber(physical.clearcoatRoughness),
          transmission: debugNumber(physical.transmission),
          ior: debugNumber(physical.ior),
          thickness: debugNumber(physical.thickness),
          attenuationDistance: Number.isFinite(physical.attenuationDistance)
            ? debugNumber(physical.attenuationDistance)
            : "Infinity",
          attenuationColor: `#${physical.attenuationColor.getHexString()}`,
          specularIntensity: debugNumber(physical.specularIntensity),
          specularColor: `#${physical.specularColor.getHexString()}`,
          sheen: debugNumber(physical.sheen),
          sheenRoughness: debugNumber(physical.sheenRoughness),
          sheenColor: `#${physical.sheenColor.getHexString()}`,
          iridescence: debugNumber(physical.iridescence),
          iridescenceIOR: debugNumber(physical.iridescenceIOR),
          iridescenceThicknessRange: physical.iridescenceThicknessRange.map(
            debugNumber,
          ),
        }
      : null,
  };
}

function changedDebugValues(
  current: Record<string, unknown>,
  original: Record<string, unknown>,
) {
  return Object.fromEntries(
    Object.entries(current).filter(
      ([key, value]) => JSON.stringify(value) !== JSON.stringify(original[key]),
    ),
  );
}

function serializeDebugMaterialRecord(
  record: ViewerMaterialRecord,
  index: number,
) {
  const currentProperties = serializeDebugMaterial(record.material);
  const originalProperties = serializeDebugMaterial(record.original);
  const currentTextures = Object.fromEntries(
    DEBUG_TEXTURE_KEYS.map((key) => [
      key,
      serializeDebugTexture(
        record.material[key],
        record.textureOverrides.has(key),
      ),
    ]),
  );
  const originalTextures = Object.fromEntries(
    DEBUG_TEXTURE_KEYS.map((key) => [
      key,
      serializeDebugTexture(record.original[key]),
    ]),
  );
  const propertyChanges = changedDebugValues(
    currentProperties,
    originalProperties,
  );
  const textureChanges = changedDebugValues(
    currentTextures,
    originalTextures,
  );

  return {
    index,
    id: record.id,
    label: record.label,
    usage: record.usage,
    hasChanges:
      Object.keys(propertyChanges).length > 0 ||
      Object.keys(textureChanges).length > 0,
    changes: {
      properties: propertyChanges,
      textures: textureChanges,
    },
    current: {
      properties: currentProperties,
      textures: currentTextures,
    },
    original: {
      properties: originalProperties,
      textures: originalTextures,
    },
  };
}

async function copyDebugText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard copy failed.");
}

interface ActiveMaterialPulse {
  material: THREE.MeshStandardMaterial;
  emissive: THREE.Color;
  emissiveIntensity: number;
  elapsed: number;
}

function MaterialSelectionPulse({
  materials,
  selectedMaterialId,
  trigger,
}: {
  materials: ViewerMaterialRecord[];
  selectedMaterialId: string | null;
  trigger: number;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const activePulse = useRef<ActiveMaterialPulse | null>(null);
  const highlight = useMemo(() => new THREE.Color("#ff5a12"), []);

  const restoreMaterial = useCallback(() => {
    const active = activePulse.current;
    if (!active) return;
    active.material.emissive.copy(active.emissive);
    active.material.emissiveIntensity = active.emissiveIntensity;
    activePulse.current = null;
  }, []);

  useEffect(() => {
    restoreMaterial();
    const record = materials.find(({ id }) => id === selectedMaterialId);
    if (!record) return;

    activePulse.current = {
      material: record.material,
      emissive: record.material.emissive.clone(),
      emissiveIntensity: record.material.emissiveIntensity,
      elapsed: 0,
    };
    invalidate();

    return restoreMaterial;
  }, [invalidate, materials, restoreMaterial, selectedMaterialId, trigger]);

  useFrame((_, delta) => {
    const active = activePulse.current;
    if (!active) return;

    const duration = 0.8;
    active.elapsed += Math.min(delta, 0.05);
    const progress = Math.min(active.elapsed / duration, 1);
    const envelope = Math.sin(progress * Math.PI);
    active.material.emissive
      .copy(active.emissive)
      .lerp(highlight, envelope * 0.92);
    active.material.emissiveIntensity =
      active.emissiveIntensity + envelope * 3.5;

    if (progress >= 1) {
      restoreMaterial();
    } else {
      invalidate();
    }
  });

  return null;
}

interface SceneInspectorContextValue {
  active: boolean;
  viewerOpen: boolean;
  hoveredObject: THREE.Object3D | null;
  hoveredLabel: string | null;
  clearHover: () => void;
  inspect: (
    root: THREE.Object3D,
    hit: THREE.Object3D,
    resolver?: InspectableResolver,
  ) => void;
  preview: (
    root: THREE.Object3D,
    hit: THREE.Object3D,
    resolver?: InspectableResolver,
  ) => void;
}

const SceneInspectorContext = createContext<SceneInspectorContextValue | null>(
  null,
);

function isIgnoredObject(object: THREE.Object3D) {
  const name = object.name.toLowerCase();
  return (
    name === "floor" ||
    name === "ground" ||
    name.includes("shadow") ||
    object instanceof THREE.Light ||
    object instanceof THREE.Camera
  );
}

function resolveInspectableRoot(
  root: THREE.Object3D,
  hit: THREE.Object3D,
) {
  if (!root.getObjectById(hit.id) || isIgnoredObject(hit)) return null;
  if (
    root.userData.inspectRoot === true ||
    root.userData.zoomable === true
  ) {
    return root;
  }

  let selected = hit;
  while (selected.parent && selected.parent !== root) {
    if (
      selected.userData.inspectRoot === true ||
      selected.userData.zoomable === true ||
      selected.parent.userData.terminate !== undefined
    ) {
      break;
    }
    selected = selected.parent;
  }

  return isIgnoredObject(selected) ? null : selected;
}

function getObjectPath(root: THREE.Object3D, object: THREE.Object3D) {
  const path: number[] = [];
  let current: THREE.Object3D | null = object;

  while (current && current !== root) {
    const parent: THREE.Object3D | null = current.parent;
    if (!parent) return null;
    const childIndex = parent.children.indexOf(current);
    if (childIndex === -1) return null;
    path.unshift(childIndex);
    current = parent;
  }

  return current === root ? path : null;
}

function formatObjectName(object: THREE.Object3D, fallback: string) {
  const rawName = object.name || fallback;
  if (
    /^(default\s*material|material|mesh|object|node|scene|root)[._ -]*\d*$/i.test(
      rawName,
    )
  ) {
    return fallback;
  }
  return rawName
    .replace(/[_-]+/g, " ")
    .replace(/\.\d+$/, "")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function IsolatedObject({
  modelUrl,
  selection,
  defaultNormalScale,
  onReady,
  onSelectMaterial,
}: {
  modelUrl: string;
  selection: ObjectSelection;
  defaultNormalScale?: number;
  onReady: (data: ViewerSceneData) => void;
  onSelectMaterial: (materialId: string) => void;
}) {
  const { scene: sourceScene } = useGLTF(modelUrl);
  const pathKey = selection.path.join(".");
  const payload = useMemo(() => {
    const scene = cloneSkinned(sourceScene);
    let selected: THREE.Object3D = scene;

    for (const childIndex of selection.path) {
      selected = selected.children[childIndex] ?? selected;
    }

    scene.updateMatrixWorld(true);
    selected.updateWorldMatrix(true, true);
    const worldMatrix = selected.matrixWorld.clone();
    selected.parent?.remove(selected);
    worldMatrix.decompose(
      selected.position,
      selected.quaternion,
      selected.scale,
    );
    selected.updateMatrixWorld(true);

    const materialClones = new Map<THREE.Material, THREE.Material>();
    const materialUsage = new Map<THREE.Material, number>();
    const cloneMaterial = (source: THREE.Material) => {
      let material = materialClones.get(source);
      if (!material) {
        material = source.clone();
        if (
          defaultNormalScale !== undefined &&
          material instanceof THREE.MeshStandardMaterial &&
          material.normalMap
        ) {
          material.normalScale.set(defaultNormalScale, defaultNormalScale);
        }
        applyModelMaterialOverride(modelUrl, material);
        materialClones.set(source, material);
      }
      materialUsage.set(material, (materialUsage.get(material) ?? 0) + 1);
      return material;
    };

    selected.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = Array.isArray(child.material)
          ? child.material.map(cloneMaterial)
          : cloneMaterial(child.material);
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const bounds = new THREE.Box3().setFromObject(selected);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const largestDimension = Math.max(size.x, size.y, size.z);
    const normalizedScale =
      Number.isFinite(largestDimension) && largestDimension > 0.0001
        ? 4.8 / largestDimension
        : 1;

    selected.position.sub(center);
    const normalizedObject = new THREE.Group();
    normalizedObject.scale.setScalar(normalizedScale);
    normalizedObject.add(selected);
    normalizedObject.updateMatrixWorld(true);

    const editableMaterials: ViewerMaterialRecord[] = [];
    const originalMaterials: THREE.Material[] = [];
    let editableIndex = 0;
    for (const material of materialClones.values()) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      const original = material.clone() as THREE.MeshStandardMaterial;
      originalMaterials.push(original);
      editableIndex += 1;
      const materialName = material.name.trim();
      editableMaterials.push({
        id: material.uuid,
        label: materialName || `Material ${editableIndex}`,
        material,
        original,
        usage: materialUsage.get(material) ?? 1,
        ownedTextures: new Set(),
        textureOverrides: new Map(),
      });
    }

    const normalizedHeight = size.y * normalizedScale;
    const normalizedHorizontal = Math.max(size.x, size.z) * normalizedScale;

    return {
      object: normalizedObject,
      materials: editableMaterials,
      ownedMaterials: [...materialClones.values()],
      originalMaterials,
      shadowY: -Math.max(normalizedHeight / 2 + 0.22, 0.9),
      shadowScale: Math.max(3.8, normalizedHorizontal * 1.45),
    };
    // The path key provides stable memoization without depending on an array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultNormalScale, modelUrl, pathKey, sourceScene]);

  useEffect(() => {
    onReady({
      materials: payload.materials,
      shadowY: payload.shadowY,
      shadowScale: payload.shadowScale,
    });
  }, [onReady, payload]);

  useEffect(
    () => () => {
      payload.materials.forEach((record) => {
        record.ownedTextures.forEach((texture) => texture.dispose());
        record.ownedTextures.clear();
        record.textureOverrides.clear();
      });
      payload.ownedMaterials.forEach((material) => material.dispose());
      payload.originalMaterials.forEach((material) => material.dispose());
    },
    [payload],
  );

  const selectClickedMaterial = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (!(event.object instanceof THREE.Mesh)) return;
      const meshMaterial = Array.isArray(event.object.material)
        ? event.object.material[event.face?.materialIndex ?? 0]
        : event.object.material;
      const record = payload.materials.find(
        ({ material }) => material === meshMaterial,
      );
      if (!record) return;
      event.stopPropagation();
      onSelectMaterial(record.id);
    },
    [onSelectMaterial, payload.materials],
  );

  return (
    <primitive
      object={payload.object}
      dispose={null}
      onClick={selectClickedMaterial}
    />
  );
}

function ZoomViewer({
  modelUrl,
  selection,
  defaultNormalScale,
  onClose,
}: {
  modelUrl: string;
  selection: ObjectSelection;
  defaultNormalScale?: number;
  onClose: () => void;
}) {
  const [editorOpen, setEditorOpen] = useState(true);
  const [sceneData, setSceneData] =
    useState<ViewerSceneData>(INITIAL_VIEWER_SCENE);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(
    null,
  );
  const [materialPulseTrigger, setMaterialPulseTrigger] = useState(0);
  const [viewerMode, setViewerMode] = useState<ViewerMode>("light");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [shadowRevision, setShadowRevision] = useState(0);
  const [shadow, setShadow] = useState<ViewerShadowSettings>({
    enabled: true,
    opacity: 0.42,
    softness: 2.6,
  });
  const [debugCopyStatus, setDebugCopyStatus] = useState<
    "idle" | "copied" | "failed"
  >("idle");
  const invalidateRef = useRef<(() => void) | null>(null);
  const materialHoldTimer = useRef<number | null>(null);
  const debugFeedbackTimer = useRef<number | null>(null);
  const suppressMaterialButtonClick = useRef(false);
  const updateSceneData = useCallback((data: ViewerSceneData) => {
    setSceneData(data);
    setSelectedMaterialId((current) =>
      data.materials.some(({ id }) => id === current)
        ? current
        : data.materials[0]?.id ?? null,
    );
  }, []);
  const selectMaterial = useCallback((materialId: string) => {
    setSelectedMaterialId(materialId);
    setMaterialPulseTrigger((trigger) => trigger + 1);
  }, []);
  const selectMaterialFromObject = useCallback(
    (materialId: string) => {
      selectMaterial(materialId);
      setEditorOpen(true);
    },
    [selectMaterial],
  );
  const invalidateViewer = useCallback(() => {
    invalidateRef.current?.();
  }, []);
  const updateShadow = useCallback(
    (settings: ViewerShadowSettings) => {
      setShadow(settings);
      window.requestAnimationFrame(invalidateViewer);
    },
    [invalidateViewer],
  );
  const updateBackgroundColor = useCallback(
    (color: string) => {
      setBackgroundColor(color);
      window.requestAnimationFrame(invalidateViewer);
    },
    [invalidateViewer],
  );
  const updateViewerMode = useCallback(
    (mode: ViewerMode) => {
      setViewerMode(mode);
      setBackgroundColor(mode === "light" ? "#ffffff" : "#000000");
      window.requestAnimationFrame(invalidateViewer);
    },
    [invalidateViewer],
  );
  const updateMaterial = useCallback(
    (rebuildShadow = false) => {
      if (rebuildShadow) {
        setShadowRevision((revision) => revision + 1);
      }
      window.requestAnimationFrame(invalidateViewer);
    },
    [invalidateViewer],
  );

  const clearMaterialHold = useCallback(() => {
    if (materialHoldTimer.current !== null) {
      window.clearTimeout(materialHoldTimer.current);
      materialHoldTimer.current = null;
    }
  }, []);

  const showDebugCopyStatus = useCallback(
    (status: "copied" | "failed") => {
      setDebugCopyStatus(status);
      if (debugFeedbackTimer.current !== null) {
        window.clearTimeout(debugFeedbackTimer.current);
      }
      debugFeedbackTimer.current = window.setTimeout(() => {
        setDebugCopyStatus("idle");
        debugFeedbackTimer.current = null;
      }, 1800);
    },
    [],
  );

  const copyMaterialDebugSnapshot = useCallback(async () => {
    const selectedIndex = sceneData.materials.findIndex(
      ({ id }) => id === selectedMaterialId,
    );
    const payload = {
      schema: "portfolio-material-debug/v1",
      exportedAt: new Date().toISOString(),
      route: window.location.pathname,
      modelUrl,
      object: {
        label: selection.label,
        path: selection.path,
      },
      selectedMaterial:
        selectedIndex >= 0
          ? {
              index: selectedIndex,
              id: sceneData.materials[selectedIndex].id,
              label: sceneData.materials[selectedIndex].label,
            }
          : null,
      viewer: {
        mode: viewerMode,
        backgroundColor,
        shadow: {
          ...shadow,
          y: debugNumber(sceneData.shadowY),
          scale: debugNumber(sceneData.shadowScale),
        },
      },
      materials: sceneData.materials.map(serializeDebugMaterialRecord),
    };

    window.__LAST_MATERIAL_DEBUG_EXPORT__ = payload;
    try {
      await copyDebugText(JSON.stringify(payload, null, 2));
      showDebugCopyStatus("copied");
    } catch {
      showDebugCopyStatus("failed");
    }
  }, [
    backgroundColor,
    modelUrl,
    sceneData,
    selectedMaterialId,
    selection,
    shadow,
    showDebugCopyStatus,
    viewerMode,
  ]);

  const beginMaterialDebugHold = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!isPortfolioDebugMode() || event.button !== 0) return;
      clearMaterialHold();
      suppressMaterialButtonClick.current = false;
      materialHoldTimer.current = window.setTimeout(() => {
        materialHoldTimer.current = null;
        suppressMaterialButtonClick.current = true;
        void copyMaterialDebugSnapshot();
      }, MATERIAL_DEBUG_HOLD_MS);
    },
    [clearMaterialHold, copyMaterialDebugSnapshot],
  );

  useEffect(
    () => () => {
      clearMaterialHold();
      if (debugFeedbackTimer.current !== null) {
        window.clearTimeout(debugFeedbackTimer.current);
      }
    },
    [clearMaterialHold],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${selection.label} object viewer`}
      data-page-navigation-ignore
      className={`fixed inset-0 z-[10000] p-4 backdrop-blur-sm lg:p-8 ${
        viewerMode === "light" ? "bg-neutral-200/80" : "bg-black/70"
      }`}
      onPointerDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div
        className={`relative h-full w-full overflow-hidden border ${
          viewerMode === "light"
            ? "border-neutral-200 bg-white shadow-[0_24px_70px_rgba(0,0,0,0.16)]"
            : "border-white/20 bg-neutral-950 shadow-2xl"
        }`}
      >
        <div className="flex h-full">
          <div className="relative min-w-0 flex-1">
            <Canvas
              className="cursor-default"
              dpr={[1, 1.5]}
              frameloop="demand"
              camera={{
                position: [0, 0, 6],
                fov: 42,
                near: 0.05,
                far: 100,
              }}
              gl={{
                // ContactShadows renders into a transparent offscreen target.
                // An alpha-enabled context prevents its empty pixels from
                // becoming an opaque black plane in the dark viewer.
                alpha: true,
                antialias: true,
                powerPreference: "high-performance",
              }}
              onCreated={({ invalidate }) => {
                invalidateRef.current = invalidate;
              }}
            >
              <color attach="background" args={[backgroundColor]} />
              <ambientLight intensity={1.35} />
              <hemisphereLight
                color="#ffffff"
                groundColor="#1f2937"
                intensity={1.4}
              />
              <directionalLight position={[5, 8, 7]} intensity={4} />
              <directionalLight
                position={[-6, 2, -5]}
                intensity={1.2}
                color="#7aa2ff"
              />
              <IsolatedObject
                modelUrl={modelUrl}
                selection={selection}
                defaultNormalScale={defaultNormalScale}
                onReady={updateSceneData}
                onSelectMaterial={selectMaterialFromObject}
              />
              <MaterialSelectionPulse
                materials={sceneData.materials}
                selectedMaterialId={selectedMaterialId}
                trigger={materialPulseTrigger}
              />
              {shadow.enabled && (
                <ContactShadows
                  key={`${sceneData.shadowY}-${sceneData.shadowScale}-${shadow.softness}-${shadowRevision}`}
                  position={[0, sceneData.shadowY, 0]}
                  opacity={shadow.opacity}
                  scale={sceneData.shadowScale}
                  blur={shadow.softness}
                  far={8}
                  resolution={256}
                  frames={1}
                  color="#000000"
                />
              )}
              <NeutralEnvironment />
              <SmoothOrbitControls
                enablePan={false}
                enableZoom
                target={[0, 0, 0]}
                minDistance={2.5}
                maxDistance={18}
              />
            </Canvas>
          </div>

          {editorOpen && (
            <MaterialEditor
              materials={sceneData.materials}
              selectedMaterialId={selectedMaterialId}
              viewerMode={viewerMode}
              backgroundColor={backgroundColor}
              shadow={shadow}
              onViewerModeChange={updateViewerMode}
              onSelectedMaterialChange={selectMaterial}
              onBackgroundColorChange={updateBackgroundColor}
              onShadowChange={updateShadow}
              onMaterialChange={updateMaterial}
              className="absolute inset-y-0 right-0 z-20 h-full w-[19rem] max-w-[calc(100%-1rem)] border shadow-[-14px_0_32px_rgba(0,0,0,0.12)] lg:static lg:max-w-none lg:shrink-0"
            />
          )}
        </div>

        <div
          className={`pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between p-5 ${
            viewerMode === "light"
              ? "text-neutral-900"
              : "bg-gradient-to-b from-black/80 to-transparent text-white"
          }`}
        >
          <div>
            <p
              className={`text-[0.65rem] font-bold uppercase tracking-[0.22em] ${
                viewerMode === "light"
                  ? "text-orange-600"
                  : "text-orange-300"
              }`}
            >
              Object viewer
            </p>
            <h2 className="mt-1 text-xl font-bold">{selection.label}</h2>
            <p
              className={`mt-1 text-xs ${
                viewerMode === "light"
                  ? "text-neutral-600"
                  : "text-white/65"
              }`}
            >
              Click a surface to edit its material · Drag to rotate · Scroll to
              zoom
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Toggle material editor"
              aria-pressed={editorOpen}
              data-page-navigation-ignore
              title={
                isPortfolioDebugMode()
                  ? `Hold for ${MATERIAL_DEBUG_HOLD_MS}ms to copy all material edits`
                  : undefined
              }
              className={`pointer-events-auto flex h-11 cursor-default select-none items-center gap-2 border px-3 text-xs font-bold uppercase tracking-[0.1em] transition-colors hover:border-orange-400 hover:bg-orange-500 hover:text-white ${
                viewerMode === "light"
                  ? "border-neutral-300 bg-white/90 text-neutral-800"
                  : "border-white/30 bg-black/40 text-white"
              }`}
              onPointerDown={beginMaterialDebugHold}
              onPointerUp={clearMaterialHold}
              onPointerLeave={clearMaterialHold}
              onPointerCancel={clearMaterialHold}
              onClick={() => {
                if (suppressMaterialButtonClick.current) {
                  suppressMaterialButtonClick.current = false;
                  return;
                }
                setEditorOpen((current) => !current);
              }}
            >
              <FiSliders aria-hidden="true" className="text-base" />
              <span className="hidden sm:inline" aria-live="polite">
                {debugCopyStatus === "copied"
                  ? "Copied"
                  : debugCopyStatus === "failed"
                    ? "Copy failed"
                    : "Materials"}
              </span>
            </button>
            <button
              type="button"
              autoFocus
              aria-label="Close object viewer"
              data-page-navigation-ignore
              className={`pointer-events-auto grid size-11 cursor-default place-items-center border text-xl transition-colors hover:border-orange-400 hover:bg-orange-500 hover:text-white ${
                viewerMode === "light"
                  ? "border-neutral-300 bg-white/90 text-neutral-800"
                  : "border-white/30 bg-black/40 text-white"
              }`}
              onClick={onClose}
            >
              <FiX aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function SceneInspectorProvider({
  children,
  modelUrl,
  label,
  defaultNormalScale,
}: {
  children: ReactNode;
  modelUrl: string;
  label: string;
  defaultNormalScale?: number;
}) {
  const [active, setActive] = useState(false);
  const [hoveredObject, setHoveredObject] =
    useState<THREE.Object3D | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [selection, setSelection] = useState<ObjectSelection | null>(null);
  const button = useRef<HTMLButtonElement>(null);

  const clearHover = useCallback(() => {
    setHoveredObject(null);
    setHoveredLabel(null);
    if (
      document.body.style.cursor === "zoom-in" ||
      document.body.style.cursor === "pointer"
    ) {
      document.body.style.cursor = "default";
    }
  }, []);

  const resolveObject = useCallback(
    (
      root: THREE.Object3D,
      hit: THREE.Object3D,
      resolver?: InspectableResolver,
    ) => (resolver ?? resolveInspectableRoot)(root, hit),
    [],
  );

  const preview = useCallback(
    (
      root: THREE.Object3D,
      hit: THREE.Object3D,
      resolver?: InspectableResolver,
    ) => {
      if (!active) return;
      const object = resolveObject(root, hit, resolver);
      if (!object) {
        clearHover();
        return;
      }
      setHoveredObject((current) => (current === object ? current : object));
      setHoveredLabel(formatObjectName(object, label));
      document.body.style.cursor = "default";
    },
    [active, clearHover, label, resolveObject],
  );

  const inspect = useCallback(
    (
      root: THREE.Object3D,
      hit: THREE.Object3D,
      resolver?: InspectableResolver,
    ) => {
      if (!active) return;
      const object = resolveObject(root, hit, resolver);
      if (!object) return;
      const path = getObjectPath(root, object);
      if (!path) return;

      setSelection({ label: formatObjectName(object, label), path });
      setActive(false);
      clearHover();
    },
    [active, clearHover, label, resolveObject],
  );

  const closeViewer = useCallback(() => {
    setSelection(null);
    window.requestAnimationFrame(() => button.current?.focus());
  }, []);

  const cancelSelection = useCallback(() => {
    setActive(false);
    clearHover();
    window.requestAnimationFrame(() => button.current?.focus());
  }, [clearHover]);

  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      cancelSelection();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [active, cancelSelection]);

  useEffect(() => {
    if (selection) {
      document.documentElement.dataset.modelInspector = "viewer";
    } else if (active) {
      document.documentElement.dataset.modelInspector = "selecting";
    } else {
      delete document.documentElement.dataset.modelInspector;
    }

    return () => {
      delete document.documentElement.dataset.modelInspector;
    };
  }, [active, selection]);

  useEffect(() => {
    return () => {
      clearHover();
      delete document.documentElement.dataset.modelInspector;
    };
  }, [clearHover]);

  const value = useMemo(
    () => ({
      active,
      viewerOpen: Boolean(selection),
      hoveredObject,
      hoveredLabel,
      clearHover,
      inspect,
      preview,
    }),
    [
      active,
      clearHover,
      hoveredLabel,
      hoveredObject,
      inspect,
      preview,
      selection,
    ],
  );

  return (
    <SceneInspectorContext.Provider value={value}>
      {children}
      <button
        ref={button}
        type="button"
        aria-pressed={active}
        data-page-navigation-ignore
        className={`fixed bottom-5 right-14 z-40 flex cursor-default items-center gap-2 border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] shadow-lg transition-colors ${
          active
            ? "border-orange-300 bg-orange-500 text-white"
            : "border-white/30 bg-black/75 text-white hover:border-orange-300 hover:bg-orange-500"
        }`}
        onClick={() => {
          if (active) {
            cancelSelection();
          } else {
            setActive(true);
            clearHover();
          }
        }}
      >
        <FiSearch aria-hidden="true" className="text-base" />
        {active ? hoveredLabel ?? "Select an object" : "Zoom objects"}
      </button>
      {selection && (
        <ZoomViewer
          modelUrl={modelUrl}
          selection={selection}
          defaultNormalScale={defaultNormalScale}
          onClose={closeViewer}
        />
      )}
    </SceneInspectorContext.Provider>
  );
}

export function useSceneInspector() {
  const context = useContext(SceneInspectorContext);
  if (!context) {
    throw new Error(
      "useSceneInspector must be used within SceneInspectorProvider",
    );
  }
  return context;
}

export function useInspectableObject(
  root: THREE.Object3D | null,
  resolver?: InspectableResolver,
) {
  const inspector = useSceneInspector();

  return {
    inspectionActive: inspector.active,
    inspectionHandlers: {
      onPointerMove: (event: ThreeEvent<PointerEvent>) => {
        if (!inspector.active || !root) return;
        event.stopPropagation();
        inspector.preview(root, event.object, resolver);
      },
      onPointerOut: () => {
        if (inspector.active) inspector.clearHover();
      },
      onClick: (event: ThreeEvent<MouseEvent>) => {
        if (!inspector.active || !root) return;
        event.stopPropagation();
        inspector.inspect(root, event.object, resolver);
      },
    },
  };
}

export function SceneOutline({ keyframing = true }: { keyframing?: boolean } = {}) {
  const { active, hoveredObject } = useSceneInspector();
  const outlineSelection = useMemo(() => {
    if (!hoveredObject) return [];
    if (hoveredObject instanceof THREE.Mesh) return [hoveredObject];

    const meshes: THREE.Object3D[] = [];
    hoveredObject.traverse((child) => {
      if (child instanceof THREE.Mesh && child.visible) meshes.push(child);
    });
    return meshes;
  }, [hoveredObject]);

  return (
    <>
      <ScenePositionProbe />
      {keyframing && <SceneKeyframingProbe />}
      <EffectComposer
        enabled={active && outlineSelection.length > 0}
        multisampling={0}
        resolutionScale={0.75}
        autoClear={false}
      >
        <Outline
          selection={outlineSelection}
          visibleEdgeColor={0xff8a1f}
          hiddenEdgeColor={0x3b1d08}
          edgeStrength={6}
          pulseSpeed={0}
          blur={false}
          xRay={false}
        />
      </EffectComposer>
    </>
  );
}
