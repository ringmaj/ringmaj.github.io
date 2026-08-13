"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import * as THREE from "three";
import NeutralEnvironment from "./NeutralEnvironment";
import SmoothOrbitControls from "./SmoothOrbitControls";
import {
  SceneOutline,
  useInspectableObject,
  useSceneInspector,
} from "../SceneInspector";
import { applyModelMaterialOverride } from "../modelMaterialOverrides";

const DEG = Math.PI / 180;
const PHOTO_ORBIT_LIMIT = 160 * DEG;
const WORKSPACE_MODEL_POSITION: [number, number, number] = [8, 2.1, 0];
const WORKSPACE_MODEL_ROTATION: [number, number, number] = [
  0.28327, 0.76018, 0.03286,
];
const WORKSPACE_CAMERA_POSITION: [number, number, number] = [
  5.2435, 1.418, 27.37449,
];
const WORKSPACE_ORBIT_TARGET: [number, number, number] = [
  7.43514, -1.82757, 1.3221,
];

function SceneShell({
  children,
  orthographic = false,
  camera,
  shadows = false,
  animated = false,
  dpr = [1, 1.5],
  environmentIntensity = 1,
  exposure = 1,
  toneMapping,
}: {
  children: React.ReactNode;
  orthographic?: boolean;
  camera: {
    position: [number, number, number];
    zoom?: number;
    fov?: number;
    near?: number;
    far?: number;
  };
  shadows?: boolean;
  animated?: boolean;
  dpr?: number | [number, number];
  environmentIntensity?: number;
  exposure?: number;
  toneMapping?: THREE.ToneMapping;
}) {
  const { viewerOpen } = useSceneInspector();

  return (
    <div className="absolute inset-y-0 left-1/2 z-20 w-screen -translate-x-1/2">
      <Canvas
        dpr={dpr}
        frameloop={viewerOpen ? "never" : animated ? "always" : "demand"}
        orthographic={orthographic}
        camera={camera}
        shadows={shadows ? "percentage" : false}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
        onCreated={({ gl }) => {
          if (toneMapping !== undefined) gl.toneMapping = toneMapping;
          gl.toneMappingExposure = exposure;
        }}
      >
        <Suspense fallback={null}>{children}</Suspense>
        <NeutralEnvironment intensity={environmentIntensity} />
        <SceneOutline />
      </Canvas>
    </div>
  );
}

function SeniorModel({ modelUrl }: { modelUrl: string }) {
  const group = useRef<THREE.Group>(null);
  const { scene: sourceScene, animations } = useGLTF(modelUrl);
  const { scene, ownedMaterials } = useMemo(() => {
    const clonedScene = sourceScene.clone(true);
    const materials: THREE.Material[] = [];

    clonedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      object.castShadow = true;
      object.receiveShadow = true;
      if (object.name === "Ground") {
        const material = new THREE.ShadowMaterial({
          color: 0xf2f2f2,
          opacity: 1,
        });
        object.material = material;
        materials.push(material);
      } else if (object.name.includes("cover_1")) {
        const sourceMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        const hiddenMaterials = sourceMaterials.map((sourceMaterial) => {
          const material = sourceMaterial.clone();
          material.colorWrite = false;
          materials.push(material);
          return material;
        });
        object.material = Array.isArray(object.material)
          ? hiddenMaterials
          : hiddenMaterials[0];
        object.renderOrder = -1;
      }
    });

    return { scene: clonedScene, ownedMaterials: materials };
  }, [sourceScene]);
  const { actions, mixer } = useAnimations(animations, group);
  const setFrameloop = useThree((state) => state.setFrameloop);
  const invalidate = useThree((state) => state.invalidate);
  const { inspectionHandlers } = useInspectableObject(scene);

  useEffect(
    () => () => {
      ownedMaterials.forEach((material) => material.dispose());
    },
    [ownedMaterials],
  );

  useEffect(() => {
    const action = Object.values(actions)[0];
    if (!action) return;

    action.reset();
    action.clampWhenFinished = true;
    action.setLoop(THREE.LoopOnce, 1).play();
    const handleFinished = () => {
      setFrameloop("demand");
      invalidate();
    };
    mixer.addEventListener("finished", handleFinished);

    return () => {
      mixer.removeEventListener("finished", handleFinished);
      action.stop();
    };
  }, [actions, invalidate, mixer, setFrameloop]);

  return (
    <group
      ref={group}
      scale={25}
      position={[0, -70, 0]}
      rotation={[15 * DEG, -1.760226, 0]}
      {...inspectionHandlers}
    >
      <primitive object={scene} dispose={null} />
    </group>
  );
}

export function BuildIntegrationScene({ modelUrl }: { modelUrl: string }) {
  return (
    <SceneShell
      orthographic
      animated
      camera={{ position: [-80, 0, 300], zoom: 1.5, near: 0.0001, far: 10000 }}
      shadows
      environmentIntensity={1.32}
      exposure={0.46}
      toneMapping={THREE.ACESFilmicToneMapping}
    >
      <ambientLight intensity={2.8} />
      <directionalLight
        position={[300, 500, -100]}
        intensity={6}
        castShadow
      />
      <SeniorModel modelUrl={modelUrl} />
      <SmoothOrbitControls
        target={[-80, 0, 0]}
        enableRotate={false}
        enablePan
        enableZoom
        minZoom={0.9}
        maxZoom={3}
      />
    </SceneShell>
  );
}

function WorkspaceModel({ modelUrl }: { modelUrl: string }) {
  const { scene: sourceScene } = useGLTF(modelUrl);
  const maxAnisotropy = useThree((state) =>
    state.gl.capabilities.getMaxAnisotropy(),
  );
  const { scene, ownedMaterials, groundPosition, shadowScale } = useMemo(() => {
    const clonedScene = sourceScene.clone(true);
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();

    clonedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const sourceMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      const clonedMaterials = sourceMaterials.map((sourceMaterial) => {
        const material = sourceMaterial.clone();
        materials.add(material);
        Object.values(material).forEach((value) => {
          if (value instanceof THREE.Texture) textures.add(value);
        });
        if (
          material instanceof THREE.MeshStandardMaterial ||
          material instanceof THREE.MeshPhysicalMaterial
        ) {
          material.envMapIntensity = 1;
        }
        applyModelMaterialOverride(modelUrl, material);
        return material;
      });
      object.material = Array.isArray(object.material)
        ? clonedMaterials
        : clonedMaterials[0]!;
    });

    textures.forEach((texture) => {
      texture.anisotropy = Math.min(8, maxAnisotropy);
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.generateMipmaps = true;
      texture.needsUpdate = true;
    });

    const centeredScene = new THREE.Group();
    centeredScene.name = "Centered workspace model";
    clonedScene.scale.setScalar(10);
    clonedScene.rotation.set(0, -1.7, 0);
    centeredScene.add(clonedScene);
    centeredScene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(centeredScene);
    const center = bounds.getCenter(new THREE.Vector3());
    clonedScene.position.sub(center);
    centeredScene.updateMatrixWorld(true);
    centeredScene.userData.zoomable = true;

    const groundProbe = new THREE.Group();
    groundProbe.rotation.set(0, 45 * DEG, 0);
    groundProbe.add(centeredScene);
    groundProbe.updateMatrixWorld(true);
    const groundedBounds = new THREE.Box3().setFromObject(groundProbe);
    const groundCenter = groundedBounds.getCenter(new THREE.Vector3());
    const groundSize = groundedBounds.getSize(new THREE.Vector3());
    const shadowScale = Math.max(groundSize.x, groundSize.z) * 1.35;
    const groundPosition: [number, number, number] = [
      groundCenter.x,
      groundedBounds.min.y - 0.015,
      groundCenter.z,
    ];
    groundProbe.remove(centeredScene);

    return {
      scene: centeredScene,
      ownedMaterials: materials,
      groundPosition,
      shadowScale,
    };
  }, [maxAnisotropy, modelUrl, sourceScene]);
  const targets = useRef(new Map<string, number>());
  const invalidate = useThree((state) => state.invalidate);
  const { inspectionActive, inspectionHandlers } =
    useInspectableObject(scene);

  useEffect(
    () => () => {
      document.body.style.cursor = "default";
      ownedMaterials.forEach((material) => material.dispose());
    },
    [ownedMaterials],
  );

  useFrame((_, delta) => {
    let stillAnimating = false;
    for (const [name, target] of targets.current) {
      const object = scene.getObjectByName(name);
      if (!object) continue;
      if (name === "chair") {
        object.rotation.z = THREE.MathUtils.damp(
          object.rotation.z,
          target,
          5,
          delta,
        );
        stillAnimating ||= Math.abs(object.rotation.z - target) > 0.001;
      }
      if (name === "ultrawide_screen" && object instanceof THREE.Mesh) {
        object.material = Array.isArray(object.material)
          ? object.material
          : object.material;
        object.material.color.lerpScalar(target, Math.min(1, delta * 8));
        stillAnimating ||= Math.abs(object.material.color.r - target) > 0.001;
      }
    }
    if (stillAnimating) invalidate();
    else targets.current.clear();
  });

  const interact = (event: ThreeEvent<MouseEvent>) => {
    if (inspectionActive) return;
    event.stopPropagation();
    const object = event.object;
    if (object.name === "chair")
      targets.current.set("chair", object.rotation.z + Math.PI * 2);
    if (object.name === "ultrawide_screen" && object instanceof THREE.Mesh) {
      targets.current.set(
        "ultrawide_screen",
        object.material.color.r > 0.2 ? 0.02 : 1,
      );
    }
    invalidate();
  };

  return (
    <group
      position={WORKSPACE_MODEL_POSITION}
      rotation={WORKSPACE_MODEL_ROTATION}
    >
      <group rotation={[0, 45 * DEG, 0]} {...inspectionHandlers}>
        <primitive
          object={scene}
          onClick={interact}
          onPointerOver={(event: ThreeEvent<PointerEvent>) => {
            if (["chair", "ultrawide_screen"].includes(event.object.name))
              document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "default";
          }}
          dispose={null}
        />
      </group>
      <mesh
        position={groundPosition}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[shadowScale * 1.45, shadowScale * 1.45]} />
        <shadowMaterial
          color="#000000"
          opacity={0.06}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function WorkspaceShadowLight() {
  const target = useMemo(() => {
    const object = new THREE.Object3D();
    object.position.set(...WORKSPACE_MODEL_POSITION);
    return object;
  }, []);

  return (
    <>
      <primitive object={target} />
      <directionalLight
        position={[12, 24, 9]}
        target={target}
        intensity={1.012}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0002}
        shadow-normalBias={0.035}
        shadow-radius={4}
      />
    </>
  );
}

export function WorkspaceScene({ modelUrl }: { modelUrl: string }) {
  return (
    <SceneShell
      camera={{
        position: WORKSPACE_CAMERA_POSITION,
        fov: 58,
        near: 0.1,
        far: 500,
      }}
      shadows
      dpr={[1, 1.75]}
      environmentIntensity={0.85}
      exposure={0.05}
      toneMapping={THREE.NoToneMapping}
    >
      <ambientLight intensity={0.22} />
      <hemisphereLight
        color="#ffffff"
        groundColor="#4b5563"
        intensity={0.308}
      />
      <WorkspaceShadowLight />
      <directionalLight
        position={[-6, 2, -5]}
        intensity={0.22}
        color="#b8c9ed"
      />
      <WorkspaceModel modelUrl={modelUrl} />
      <SmoothOrbitControls
        target={WORKSPACE_ORBIT_TARGET}
        minDistance={18}
        maxDistance={45}
        minPolarAngle={1.32}
        maxPolarAngle={1.48}
      />
    </SceneShell>
  );
}

const CAR_MODULE_DETAILS = [
  {
    objectName: "lidar_module",
    title: "TFmini Plus Micro",
    category: "LIDAR Module",
    description:
      "Single-point, short-range LIDAR in an IP65 enclosure. Detects from 0.1–12 meters at 1000 Hz with a 3.6° field of view and communicates over UART or I²C.",
    phase: 3,
    rotationAmplitude: 0.004,
    verticalOffset: 0,
  },
  {
    objectName: "display_module",
    title: "Custom Display",
    category: "Display Module",
    description:
      "A touchscreen head unit that presents four camera angles for wider coverage and a clearer view of the car's surroundings.",
    phase: 1,
    rotationAmplitude: 0,
    verticalOffset: 0.55,
  },
  {
    objectName: "esp32_module",
    title: "ESP32-WROOM-32",
    category: "ESP32 Module",
    description:
      "A 3.3 V, 240 MHz controller with 4 MB flash and 28 GPIO pins. It manages the camera and LIDAR outputs sent to the display.",
    phase: 4,
    rotationAmplitude: 0.004,
    verticalOffset: 0,
  },
  {
    objectName: "camera_module",
    title: "L002 HD 170",
    category: "Camera Module",
    description:
      "A 170° HD wide-angle camera with RCA output and an IP69 waterproof rating for rain, road spray, and washdowns.",
    phase: 2,
    rotationAmplitude: 0.008,
    verticalOffset: 0,
  },
] as const;

const CAROUSEL_TURN = Math.PI / 2;
const CAROUSEL_DURATION = 0.34;
const CAROUSEL_X_COMPRESSION = 0.4;
const MODULE_FLOAT_AMPLITUDE = 0.025;
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);

interface CarModuleBinding {
  index: number;
  main: THREE.Object3D;
  parts: Array<{
    object: THREE.Object3D;
    relativePosition: THREE.Vector3;
    baseQuaternion: THREE.Quaternion;
  }>;
  basePosition: THREE.Vector3;
  phase: number;
  rotationAmplitude: number;
}

function CarModel({
  modelUrl,
  rotationTarget,
  onRotationSettled,
  onModuleSelect,
}: {
  modelUrl: string;
  rotationTarget: number;
  onRotationSettled: () => void;
  onModuleSelect: (index: number) => void;
}) {
  const { scene: sourceScene } = useGLTF(modelUrl);
  const { scene, modules } = useMemo(() => {
    const clonedScene = sourceScene.clone(true);

    const bindings: CarModuleBinding[] = [];
    CAR_MODULE_DETAILS.forEach((detail, index) => {
      const main = clonedScene.getObjectByName(detail.objectName);
      if (!main) return;
      main.userData.zoomable = true;
      main.userData.inspectRoot = true;
      const partNames =
        detail.objectName === "esp32_module"
          ? ["esp32_module", "esp32_module.001", "esp32_module.002"]
          : [detail.objectName];
      const parts = partNames.flatMap((name) => {
        const object = clonedScene.getObjectByName(name);
        if (!object) return [];
        return [
          {
            object,
            relativePosition: object.position.clone().sub(main.position),
            baseQuaternion: object.quaternion.clone(),
          },
        ];
      });
      bindings.push({
        index,
        main,
        parts,
        basePosition: main.position
          .clone()
          .addScaledVector(Y_AXIS, detail.verticalOffset),
        phase: detail.phase,
        rotationAmplitude: detail.rotationAmplitude,
      });
    });

    return { scene: clonedScene, modules: bindings };
  }, [sourceScene]);
  const currentRotation = useRef(0);
  const startRotation = useRef(0);
  const activeTarget = useRef(0);
  const elapsed = useRef(CAROUSEL_DURATION);
  const hasReportedSettlement = useRef(true);
  const animatedPosition = useRef(new THREE.Vector3());
  const findCarModule = useCallback(
    (hit: THREE.Object3D) =>
      modules.find((module) =>
        module.parts.some(
          ({ object }) =>
            object === hit || Boolean(object.getObjectById(hit.id)),
        ),
      ) ?? null,
    [modules],
  );
  const resolveCarModule = useCallback(
    (_root: THREE.Object3D, hit: THREE.Object3D) =>
      findCarModule(hit)?.main ?? null,
    [findCarModule],
  );
  const { inspectionActive, inspectionHandlers } =
    useInspectableObject(scene, resolveCarModule);

  useEffect(() => {
    startRotation.current = currentRotation.current;
    activeTarget.current = rotationTarget;
    elapsed.current = 0;
    hasReportedSettlement.current = false;
  }, [rotationTarget]);

  useFrame(({ clock }, delta) => {
    if (elapsed.current < CAROUSEL_DURATION) {
      elapsed.current = Math.min(
        elapsed.current + delta,
        CAROUSEL_DURATION,
      );
      const progress = elapsed.current / CAROUSEL_DURATION;
      const eased = 1 - (1 - progress) * (1 - progress);
      currentRotation.current = THREE.MathUtils.lerp(
        startRotation.current,
        activeTarget.current,
        eased,
      );

      if (
        progress === 1 &&
        !hasReportedSettlement.current
      ) {
        hasReportedSettlement.current = true;
        onRotationSettled();
      }
    }

    modules.forEach((module) => {
      const wave = Math.cos(clock.elapsedTime + module.phase);
      animatedPosition.current
        .copy(module.basePosition)
        .applyAxisAngle(Y_AXIS, currentRotation.current);
      animatedPosition.current.x *= CAROUSEL_X_COMPRESSION;
      animatedPosition.current.y += wave * MODULE_FLOAT_AMPLITUDE;
      const rotationOffset = wave * module.rotationAmplitude;
      module.parts.forEach((part) => {
        part.object.position
          .copy(animatedPosition.current)
          .add(part.relativePosition);
        part.object.quaternion.copy(part.baseQuaternion);
        part.object.rotateOnAxis(Y_AXIS, rotationOffset);
        part.object.rotateOnAxis(X_AXIS, rotationOffset);
      });
    });
  });

  useEffect(
    () => () => {
      document.body.style.cursor = "default";
    },
    [],
  );

  return (
    <group {...inspectionHandlers}>
      <primitive
        object={scene}
        scale={6}
        dispose={null}
        onPointerOver={() => {
          if (!inspectionActive) document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          if (inspectionActive) return;
          const module = findCarModule(event.object);
          if (!module) return;
          event.stopPropagation();
          onModuleSelect(module.index);
        }}
      />
    </group>
  );
}

export function CarProjectScene({ modelUrl }: { modelUrl: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [rotationStep, setRotationStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const selectedItem = CAR_MODULE_DETAILS[selectedIndex];
  const rotateCarousel = useCallback(
    (direction: "previous" | "next") => {
      if (isAnimating) return;
      const indexDelta = direction === "next" ? 1 : -1;
      setSelectedIndex(
        (current) =>
          (current + indexDelta + CAR_MODULE_DETAILS.length) %
          CAR_MODULE_DETAILS.length,
      );
      setRotationStep((current) => current - indexDelta);
      setIsAnimating(true);
    },
    [isAnimating],
  );
  const selectCarouselItem = useCallback(
    (targetIndex: number) => {
      if (isAnimating || targetIndex === selectedIndex) return;

      const itemCount = CAR_MODULE_DETAILS.length;
      const forwardDistance =
        (targetIndex - selectedIndex + itemCount) % itemCount;
      const indexDelta =
        forwardDistance <= itemCount / 2
          ? forwardDistance
          : forwardDistance - itemCount;

      setSelectedIndex(targetIndex);
      setRotationStep((current) => current - indexDelta);
      setIsAnimating(true);
    },
    [isAnimating, selectedIndex],
  );
  const handleRotationSettled = useCallback(() => {
    setIsAnimating(false);
  }, []);

  return (
    <>
      <SceneShell
        orthographic
        animated
        camera={{ position: [0, 1, 50], zoom: 20, near: 0.01, far: 1000 }}
      >
        <hemisphereLight intensity={1.6} groundColor="#999999" />
        <directionalLight position={[20, 20, 30]} intensity={3} />
        <group position={[10.5, 7.5, 0]} rotation={[6 * DEG, 0, 0]}>
          <CarModel
            modelUrl={modelUrl}
            rotationTarget={rotationStep * CAROUSEL_TURN}
            onRotationSettled={handleRotationSettled}
            onModuleSelect={selectCarouselItem}
          />
        </group>
        <SmoothOrbitControls
          target={[0, 1, 0]}
          enableRotate={false}
          enableZoom
          minZoom={14}
          maxZoom={32}
        />
      </SceneShell>

      <section
        data-page-navigation-ignore
        aria-label="Car component carousel"
        className="pointer-events-none absolute top-[calc(56%+4.5rem)] right-14 z-30 w-[calc(60%-5rem)] max-w-[46rem] max-sm:top-auto max-sm:right-4 max-sm:bottom-16 max-sm:w-[calc(100%-2rem)]"
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <button
            type="button"
            aria-label="Previous car component"
            disabled={isAnimating}
            className="pointer-events-auto grid size-12 place-items-center border border-black/20 bg-white/95 text-2xl text-black shadow-md transition hover:border-orange-500 hover:bg-orange-500 hover:text-white disabled:cursor-wait disabled:opacity-50"
            onClick={() => rotateCarousel("previous")}
          >
            <FiChevronLeft aria-hidden="true" />
          </button>

          <div
            aria-live="polite"
            className="min-w-0 border border-black/10 bg-white/95 px-5 py-3 text-black shadow-lg backdrop-blur-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  {selectedItem.title}
                </p>
                <p className="mt-0.5 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-orange-600">
                  {selectedItem.category}
                </p>
              </div>
              <p className="shrink-0 pt-0.5 text-[0.62rem] font-semibold tabular-nums text-black/40">
                {String(selectedIndex + 1).padStart(2, "0")} / 04
              </p>
            </div>
            <p className="mt-2 line-clamp-2 text-[0.7rem] leading-relaxed text-black/65">
              {selectedItem.description}
            </p>
          </div>

          <button
            type="button"
            aria-label="Next car component"
            disabled={isAnimating}
            className="pointer-events-auto grid size-12 place-items-center border border-black/20 bg-white/95 text-2xl text-black shadow-md transition hover:border-orange-500 hover:bg-orange-500 hover:text-white disabled:cursor-wait disabled:opacity-50"
            onClick={() => rotateCarousel("next")}
          >
            <FiChevronRight aria-hidden="true" />
          </button>
        </div>
      </section>
    </>
  );
}

function PhotoModel({
  modelUrl,
  group,
  onSelected,
}: {
  modelUrl: string;
  group: React.RefObject<THREE.Group | null>;
  onSelected: (name: string) => void;
}) {
  const { scene: sourceScene } = useGLTF(modelUrl);
  const { scene, photos, previewTemplate } = useMemo(() => {
    const clonedScene = sourceScene.clone(true);
    const photoObjects = new Map<string, THREE.Object3D>();

    clonedScene.traverse((object) => {
      if (object.name === "floor") object.visible = false;
      if (object.name.startsWith("photo_")) photoObjects.set(object.name, object);
      if (object instanceof THREE.Mesh) {
        object.castShadow = false;
        object.receiveShadow = false;
      }
    });

    return {
      scene: clonedScene,
      photos: photoObjects,
      previewTemplate:
        photoObjects.get("photo_tree") ?? photoObjects.values().next().value,
    };
  }, [sourceScene]);
  const preview = useRef<THREE.Group>(null);
  const previewOrbit = useRef(new THREE.Vector2());
  const previewPointer = useRef<{
    id: number | null;
    x: number;
    y: number;
  }>({ id: null, x: 0, y: 0 });
  const [selected, setSelected] = useState("photo_tree");
  const invalidate = useThree((state) => state.invalidate);
  const gl = useThree((state) => state.gl);
  const { inspectionActive, inspectionHandlers } =
    useInspectableObject(scene);

  const selectedTexture = useMemo(() => {
    const selectedPhoto = photos.get(selected) ?? previewTemplate;
    if (!selectedPhoto || !previewTemplate) return null;

    let texture: THREE.Texture | null = null;
    selectedPhoto.traverse((child) => {
      if (texture || !(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      const mappedMaterial = materials.find(
        (material) =>
          material instanceof THREE.MeshStandardMaterial && material.map,
      );
      if (mappedMaterial instanceof THREE.MeshStandardMaterial)
        texture = mappedMaterial.map;
    });
    return texture as THREE.Texture | null;
  }, [photos, previewTemplate, selected]);

  const { previewPhoto, previewMaterials, previewGeometries } = useMemo(() => {
    if (!previewTemplate || !selectedTexture)
      return {
        previewPhoto: null,
        previewMaterials: [] as THREE.Material[],
        previewGeometries: [] as THREE.BufferGeometry[],
      };

    const duplicate = previewTemplate.clone(true);
    const ownedMaterials: THREE.Material[] = [];
    const ownedGeometries: THREE.BufferGeometry[] = [];
    const unusedMeshes: THREE.Mesh[] = [];
    duplicate.name = "selected_photo_preview";
    duplicate.position.set(0, 0, 0);
    duplicate.scale.set(1, 1, 1);
    duplicate.quaternion.identity();
    duplicate.traverse((object) => {
      object.userData.clickable = false;
      object.userData.zoomable = false;
      object.raycast = () => undefined;
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = false;
      object.receiveShadow = false;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      const texturedMaterials = materials.filter(
        (material) =>
          material instanceof THREE.MeshStandardMaterial && material.map,
      );
      if (texturedMaterials.length === 0) {
        unusedMeshes.push(object);
        return;
      }
      const nextMaterials = materials.map((material) => {
        if (!texturedMaterials.includes(material)) return material;
        const ownedMaterial = material.clone();
        if (ownedMaterial instanceof THREE.MeshStandardMaterial) {
          ownedMaterial.map = selectedTexture;
          ownedMaterial.needsUpdate = true;
        }
        ownedMaterials.push(ownedMaterial);
        return ownedMaterial;
      });
      object.material = Array.isArray(object.material)
        ? nextMaterials
        : nextMaterials[0];
    });
    unusedMeshes.forEach((mesh) => mesh.parent?.remove(mesh));

    duplicate.updateMatrixWorld(true);
    const photoBounds = new THREE.Box3().setFromObject(duplicate);
    if (!photoBounds.isEmpty()) {
      const photoSize = photoBounds.getSize(new THREE.Vector3());
      const photoCenter = photoBounds.getCenter(new THREE.Vector3());
      const frameDepth = Math.max(
        photoSize.z,
        Math.min(photoSize.x, photoSize.y) * 0.045,
      );
      const frameGeometry = new THREE.BoxGeometry(
        photoSize.x * 1.045,
        photoSize.y * 1.045,
        frameDepth,
      );
      const frameMaterial = new THREE.MeshStandardMaterial({
        name: "Photo frame",
        color: "#f8f8f5",
        metalness: 0,
        roughness: 0.72,
      });
      const frame = new THREE.Mesh(frameGeometry, frameMaterial);
      frame.name = "selected_photo_frame";
      frame.position.set(
        photoCenter.x,
        photoCenter.y,
        photoBounds.min.z - frameDepth / 2 - 0.00015,
      );
      frame.castShadow = false;
      frame.receiveShadow = false;
      frame.raycast = () => undefined;
      duplicate.add(frame);
      ownedGeometries.push(frameGeometry);
      ownedMaterials.push(frameMaterial);
    }

    duplicate.quaternion.copy(previewTemplate.quaternion);
    duplicate.rotateOnAxis(Y_AXIS, 90 * DEG);
    duplicate.rotateOnAxis(new THREE.Vector3(0, 0, 1), 90 * DEG);
    duplicate.rotateOnAxis(Y_AXIS, 5 * DEG);

    return {
      previewPhoto: duplicate,
      previewMaterials: ownedMaterials,
      previewGeometries: ownedGeometries,
    };
  }, [previewTemplate, selectedTexture]);

  useEffect(
    () => () => {
      previewMaterials.forEach((material) => material.dispose());
      previewGeometries.forEach((geometry) => geometry.dispose());
    },
    [previewGeometries, previewMaterials],
  );

  useEffect(() => {
    const canvas = gl.domElement;

    const handlePointerDown = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      if (
        event.button !== 0 ||
        event.clientX > bounds.left + bounds.width * 0.48
      )
        return;
      previewPointer.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (previewPointer.current.id !== event.pointerId) return;
      const deltaX = event.clientX - previewPointer.current.x;
      const deltaY = event.clientY - previewPointer.current.y;
      previewPointer.current.x = event.clientX;
      previewPointer.current.y = event.clientY;
      previewOrbit.current.y = THREE.MathUtils.clamp(
        previewOrbit.current.y + deltaX * 0.008,
        -PHOTO_ORBIT_LIMIT,
        PHOTO_ORBIT_LIMIT,
      );
      previewOrbit.current.x = THREE.MathUtils.clamp(
        previewOrbit.current.x + deltaY * 0.008,
        -PHOTO_ORBIT_LIMIT,
        PHOTO_ORBIT_LIMIT,
      );
      invalidate();
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (previewPointer.current.id !== event.pointerId) return;
      previewPointer.current.id = null;
      canvas.releasePointerCapture(event.pointerId);
      canvas.style.cursor = "default";
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    return () => {
      previewPointer.current.id = null;
      canvas.style.cursor = "";
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [gl, invalidate]);

  useEffect(() => {
    let animationFrame = 0;
    let previousRender = 0;
    const frameInterval = 1000 / 40;

    const scheduleFrame = (time: number) => {
      if (
        document.visibilityState === "visible" &&
        time - previousRender >= frameInterval
      ) {
        previousRender = time;
        invalidate();
      }
      animationFrame = window.requestAnimationFrame(scheduleFrame);
    };

    animationFrame = window.requestAnimationFrame(scheduleFrame);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [invalidate]);

  useEffect(
    () => () => {
      document.body.style.cursor = "default";
    },
    [],
  );

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.06;
    if (preview.current) {
      preview.current.rotation.x = THREE.MathUtils.damp(
        preview.current.rotation.x,
        previewOrbit.current.x,
        12,
        delta,
      );
      preview.current.rotation.y = THREE.MathUtils.damp(
        preview.current.rotation.y,
        previewOrbit.current.y,
        12,
        delta,
      );
    }
  });

  const findPhoto = useCallback(
    (object: THREE.Object3D) => {
      let candidate: THREE.Object3D | null = object;
      while (candidate && candidate !== scene) {
        if (candidate.name.startsWith("photo_")) return candidate;
        candidate = candidate.parent;
      }
      return null;
    },
    [scene],
  );

  return (
    <>
      <group {...inspectionHandlers}>
        <group
          ref={group}
          scale={20}
          position={[10, -5, -4]}
          rotation={[65 * DEG, 0, 0]}
          onClick={(event: ThreeEvent<MouseEvent>) => {
            if (inspectionActive) return;
            const photo = findPhoto(event.object);
            if (!photo || event.delta > 5) return;
            event.stopPropagation();
            setSelected(photo.name);
            onSelected(photo.name);
            invalidate();
          }}
          onPointerOver={(event: ThreeEvent<PointerEvent>) => {
            if (!inspectionActive && findPhoto(event.object))
              document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "default";
          }}
        >
          <primitive object={scene} dispose={null} />
        </group>
      </group>

      {previewPhoto && (
        <group ref={preview} position={[-2.3, -0.3, 27]} scale={20}>
          <primitive object={previewPhoto} dispose={null} />
        </group>
      )}
    </>
  );
}

export function PhotoVortexScene({ modelUrl }: { modelUrl: string }) {
  const photos = useRef<THREE.Group>(null);
  const [selectedPhoto, setSelectedPhoto] = useState("photo_tree");

  return (
    <>
      <SceneShell
        camera={{ position: [0, 0, 30], fov: 75, near: 0.1, far: 500 }}
        dpr={1}
      >
        <ambientLight intensity={0.95} />
        <directionalLight position={[20, -120, 350]} intensity={1.8} />
        <PhotoModel
          modelUrl={modelUrl}
          group={photos}
          onSelected={setSelectedPhoto}
        />
        <SmoothOrbitControls
          minDistance={20}
          maxDistance={55}
          rotateObject={photos}
          rotateRegion="right"
        />
      </SceneShell>
      <output className="sr-only" aria-live="polite">
        Selected photo: {selectedPhoto.replace(/^photo_/, "")}
      </output>
    </>
  );
}

function HobbiesModel({
  modelUrl,
  group,
}: {
  modelUrl: string;
  group: React.RefObject<THREE.Group | null>;
}) {
  const { scene: sourceScene } = useGLTF(modelUrl);
  const scene = useMemo(() => {
    const clone = sourceScene.clone(true);
    clone.rotateOnAxis(new THREE.Vector3(0, 1, 0), -135 * DEG);
    clone.rotateOnAxis(new THREE.Vector3(0, 1, 1), -10 * DEG);
    clone.rotateOnAxis(new THREE.Vector3(1, 0, 0), -5 * DEG);
    clone.rotateOnAxis(new THREE.Vector3(1, 0, 1), -5 * DEG);
    return clone;
  }, [sourceScene]);
  const focused = useRef(false);
  const moving = useRef(false);
  const targetPosition = useRef(new THREE.Vector3(30, -10, -500));
  const invalidate = useThree((state) => state.invalidate);
  const { inspectionActive, inspectionHandlers } =
    useInspectableObject(scene);

  useEffect(() => {
    const floor = scene.getObjectByName("floor");
    if (floor instanceof THREE.Mesh) {
      const material = new THREE.ShadowMaterial({
        color: 0xbdbdbd,
        opacity: 1,
      });
      floor.material = material;
      floor.receiveShadow = true;
      return () => material.dispose();
    }
  }, [scene]);

  useFrame((_, delta) => {
    if (!group.current || !moving.current) return;
    group.current.position.lerp(targetPosition.current, Math.min(1, delta * 4));
    if (
      group.current.position.distanceToSquared(targetPosition.current) < 0.0001
    ) {
      group.current.position.copy(targetPosition.current);
      moving.current = false;
    } else {
      invalidate();
    }
  });

  return (
    <group {...inspectionHandlers}>
      <group ref={group} scale={0.3} position={[30, -10, -500]}>
        <primitive
          object={scene}
          onClick={(event: ThreeEvent<MouseEvent>) => {
            if (inspectionActive) return;
            const hotspot = ["camera_base", "macbook_base", "hoop_base"].find(
              (name) =>
                event.object.name === name || event.object.parent?.name === name,
            );
            if (!hotspot) return;
            event.stopPropagation();
            const object = scene.getObjectByName(hotspot);
            focused.current = !focused.current;
            if (focused.current && object)
              targetPosition.current.copy(object.position).multiplyScalar(-0.3);
            else targetPosition.current.set(30, -10, -500);
            moving.current = true;
            invalidate();
          }}
          onPointerOver={() => {
            document.body.style.cursor = "zoom-in";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "default";
          }}
          dispose={null}
        />
      </group>
    </group>
  );
}

export function HobbiesScene({ modelUrl }: { modelUrl: string }) {
  const hobbies = useRef<THREE.Group>(null);

  return (
    <SceneShell
      orthographic
      camera={{ position: [0, 60, 0], zoom: 5, near: 0.01, far: 1000 }}
      shadows
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[50, 200, -600]} intensity={1.8} castShadow />
      <HobbiesModel modelUrl={modelUrl} group={hobbies} />
      <SmoothOrbitControls
        target={[0, 60, -500]}
        enableZoom
        minZoom={3}
        maxZoom={9}
        rotateObject={hobbies}
      />
    </SceneShell>
  );
}
