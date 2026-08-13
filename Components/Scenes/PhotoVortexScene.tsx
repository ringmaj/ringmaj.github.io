"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useGLTF } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import {
  CuboidCollider,
  Physics,
  RigidBody,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import {
  SceneOutline,
  useInspectableObject,
  useSceneInspector,
} from "../SceneInspector";
import NeutralEnvironment from "./NeutralEnvironment";
import SmoothOrbitControls from "./SmoothOrbitControls";

const DEG = Math.PI / 180;
const PREVIEW_ORBIT_LIMIT = 160 * DEG;
const PHOTO_SCALE = 20;
const VORTEX_CENTER = new THREE.Vector3(8, 2.5, -2);
const VORTEX_MIN_Y = -8;
const VORTEX_MAX_Y = 17;
const VORTEX_HEIGHT = VORTEX_MAX_Y - VORTEX_MIN_Y;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

type PreparedPhoto = {
  name: string;
  object: THREE.Object3D;
  position: [number, number, number];
  rotation: [number, number, number];
  halfExtents: [number, number, number];
  phase: number;
  baseY: number;
  radiusOffset: number;
  liftOffset: number;
};

function seeded(index: number, salt: number) {
  const value = Math.sin(index * 91.713 + salt * 17.173) * 43758.5453;
  return value - Math.floor(value);
}

function vortexPosition(index: number, count: number) {
  const height = (index + 0.5) / count;
  const phase = index * GOLDEN_ANGLE;
  const radius = 1.8 + height * 6.2;
  return [
    VORTEX_CENTER.x + Math.cos(phase) * radius,
    VORTEX_MIN_Y + height * VORTEX_HEIGHT,
    VORTEX_CENTER.z + Math.sin(phase) * radius,
  ] as [number, number, number];
}

function preparePhotos(sourceScene: THREE.Object3D): PreparedPhoto[] {
  const sourcePhotos: THREE.Object3D[] = [];
  sourceScene.traverse((object) => {
    if (object.name.startsWith("photo_")) sourcePhotos.push(object);
  });

  return sourcePhotos.map((source, index) => {
    const object = source.clone(true);
    const unusedMeshes: THREE.Mesh[] = [];
    object.name = source.name;
    object.position.set(0, 0, 0);
    object.quaternion.identity();
    object.scale.setScalar(PHOTO_SCALE);
    object.traverse((child) => {
      child.userData.zoomable = false;
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      const hasPhotoTexture = materials.some(
        (material) =>
          (material instanceof THREE.MeshStandardMaterial ||
            material instanceof THREE.MeshBasicMaterial) &&
          Boolean(material.map) &&
          material.name.trim().toLowerCase() !== "back",
      );
      if (!hasPhotoTexture) {
        unusedMeshes.push(child);
        return;
      }
      child.castShadow = true;
      child.receiveShadow = true;
    });
    unusedMeshes.forEach((mesh) => mesh.parent?.remove(mesh));
    object.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(object);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    object.position.sub(center);
    object.updateMatrixWorld(true);

    const position = vortexPosition(index, sourcePhotos.length);

    return {
      name: source.name,
      object,
      position,
      rotation: [
        (seeded(index, 1) - 0.5) * Math.PI,
        index * GOLDEN_ANGLE,
        (seeded(index, 2) - 0.5) * Math.PI,
      ],
      halfExtents: [
        Math.max(0.34, size.x * 0.48),
        Math.max(0.42, size.y * 0.48),
        Math.max(0.055, size.z * 0.52),
      ],
      phase: index * GOLDEN_ANGLE,
      baseY: position[1],
      radiusOffset: (seeded(index, 3) - 0.5) * 0.75,
      liftOffset: (seeded(index, 4) - 0.5) * 0.45,
    };
  });
}

function SelectedPhotoPreview({ photo }: { photo: PreparedPhoto | undefined }) {
  const preview = useRef<THREE.Group>(null);
  const orbit = useRef(new THREE.Vector2(0, -5 * DEG));
  const pointer = useRef({ id: null as number | null, x: 0, y: 0 });
  const gl = useThree((state) => state.gl);

  const previewPhoto = useMemo(() => {
    if (!photo) return null;
    const duplicate = photo.object.clone(true);
    const photoMeshes: THREE.Mesh[] = [];
    duplicate.name = "selected_photo_preview";
    duplicate.traverse((object) => {
      object.userData.clickable = false;
      object.userData.zoomable = false;
      object.raycast = () => undefined;
      if (object instanceof THREE.Mesh) {
        photoMeshes.push(object);
        object.castShadow = false;
        object.receiveShadow = false;
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        const previewMaterials = materials.map((material) => {
          const previewMaterial = material.clone();
          previewMaterial.side = THREE.FrontSide;
          previewMaterial.needsUpdate = true;
          return previewMaterial;
        });
        object.material = Array.isArray(object.material)
          ? previewMaterials
          : previewMaterials[0];
      }
    });
    photoMeshes.forEach((photoMesh) => {
      const blankBack = new THREE.Mesh(
        photoMesh.geometry,
        new THREE.MeshPhysicalMaterial({
          color: "#f5f5f2",
          metalness: 0,
          roughness: 0.24,
          clearcoat: 0.82,
          clearcoatRoughness: 0.16,
          side: THREE.BackSide,
        }),
      );
      blankBack.name = `${photoMesh.name || "photo"}_blank_back`;
      blankBack.raycast = () => undefined;
      blankBack.castShadow = false;
      blankBack.receiveShadow = false;
      photoMesh.add(blankBack);
    });
    return duplicate;
  }, [photo]);

  useEffect(
    () => () => {
      previewPhoto?.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => material.dispose());
      });
    },
    [previewPhoto],
  );

  useEffect(() => {
    const canvas = gl.domElement;

    const handlePointerDown = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      if (
        event.button !== 0 ||
        event.clientX < bounds.left + bounds.width * 0.52
      )
        return;
      pointer.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (pointer.current.id !== event.pointerId) return;
      const deltaX = event.clientX - pointer.current.x;
      const deltaY = event.clientY - pointer.current.y;
      pointer.current.x = event.clientX;
      pointer.current.y = event.clientY;
      orbit.current.y = THREE.MathUtils.clamp(
        orbit.current.y + deltaX * 0.008,
        -PREVIEW_ORBIT_LIMIT,
        PREVIEW_ORBIT_LIMIT,
      );
      orbit.current.x = THREE.MathUtils.clamp(
        orbit.current.x + deltaY * 0.008,
        -PREVIEW_ORBIT_LIMIT,
        PREVIEW_ORBIT_LIMIT,
      );
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (pointer.current.id !== event.pointerId) return;
      pointer.current.id = null;
      canvas.releasePointerCapture(event.pointerId);
      canvas.style.cursor = "default";
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    return () => {
      pointer.current.id = null;
      canvas.style.cursor = "";
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [gl]);

  useFrame((_, delta) => {
    if (!preview.current) return;
    preview.current.rotation.x = THREE.MathUtils.damp(
      preview.current.rotation.x,
      orbit.current.x,
      12,
      delta,
    );
    preview.current.rotation.y = THREE.MathUtils.damp(
      preview.current.rotation.y,
      orbit.current.y,
      12,
      delta,
    );
  });

  if (!previewPhoto || !photo) return null;

  return (
    <group ref={preview} position={[5.75, -0.55, 24.5]} scale={1.72}>
      <primitive object={previewPhoto} dispose={null} />
    </group>
  );
}

function PhotoTornado({
  photos,
  onSelected,
}: {
  photos: PreparedPhoto[];
  onSelected: (name: string) => void;
}) {
  const bodies = useRef<Array<RapierRigidBody | null>>([]);
  const [selectionRoot, setSelectionRoot] = useState<THREE.Group | null>(null);
  const { inspectionActive, inspectionHandlers } =
    useInspectableObject(selectionRoot);

  const handleSelect = useCallback(
    (name: string, event: ThreeEvent<MouseEvent>) => {
      if (inspectionActive || event.delta > 6) return;
      event.stopPropagation();
      onSelected(name);
    },
    [inspectionActive, onSelected],
  );

  useEffect(
    () => () => {
      document.body.style.cursor = "default";
    },
    [],
  );

  useFrame(({ clock }, delta) => {
    const elapsed = clock.getElapsedTime();
    const step = Math.min(delta, 1 / 30);

    bodies.current.forEach((body, index) => {
      if (!body) return;
      const photo = photos[index];
      if (!photo) return;
      const position = body.translation();
      const distanceFromAxis = Math.hypot(
        position.x - VORTEX_CENTER.x,
        position.z - VORTEX_CENTER.z,
      );

      const radialX = position.x - VORTEX_CENTER.x;
      const radialZ = position.z - VORTEX_CENTER.z;
      const radius = Math.max(0.001, Math.hypot(radialX, radialZ));
      const normalX = radialX / radius;
      const normalZ = radialZ / radius;
      const height = THREE.MathUtils.clamp(
        (position.y - VORTEX_MIN_Y) / VORTEX_HEIGHT,
        0,
        1,
      );
      const targetRadius = 1.8 + height * 6.2 + photo.radiusOffset;
      const confinement = distanceFromAxis > 10 ? 5.5 : 3.2;
      const radialCorrection = THREE.MathUtils.clamp(
        (targetRadius - radius) * confinement,
        -12,
        12,
      );
      const swirlSpeed = 3.25 + height * 2.8;
      const desiredX = -normalZ * swirlSpeed + normalX * radialCorrection;
      const movingTargetY =
        photo.baseY + Math.sin(elapsed * 0.34 + photo.phase) * 1.75;
      const desiredY = THREE.MathUtils.clamp(
        (movingTargetY - position.y) * 1.45 +
          photo.liftOffset +
          Math.sin(elapsed * 1.1 + photo.phase) * 0.32,
        -3,
        3,
      );
      const desiredZ = normalX * swirlSpeed + normalZ * radialCorrection;
      const velocity = body.linvel();
      const velocityLength = Math.hypot(
        velocity.x,
        velocity.y,
        velocity.z,
      );
      if (velocityLength > 11) {
        const velocityScale = 11 / velocityLength;
        body.setLinvel(
          {
            x: velocity.x * velocityScale,
            y: velocity.y * velocityScale,
            z: velocity.z * velocityScale,
          },
          true,
        );
      }
      const mass = Math.max(0.01, body.mass());
      const response = 3.8 * step * mass;
      let impulseX = (desiredX - velocity.x) * response;
      let impulseY = (desiredY - velocity.y) * response;
      let impulseZ = (desiredZ - velocity.z) * response;
      const impulseLength = Math.hypot(impulseX, impulseY, impulseZ);
      const maxImpulse = 0.78 * mass;
      if (impulseLength > maxImpulse) {
        const scale = maxImpulse / impulseLength;
        impulseX *= scale;
        impulseY *= scale;
        impulseZ *= scale;
      }
      body.applyImpulse(
        { x: impulseX, y: impulseY, z: impulseZ },
        true,
      );

      const angularVelocity = body.angvel();
      body.applyTorqueImpulse(
        {
          x:
            (Math.sin(elapsed * 0.8 + photo.phase) * 0.75 -
              angularVelocity.x * 0.08) *
            step *
            mass,
          y:
            (Math.cos(elapsed * 0.65 + photo.phase) * 0.55 -
              angularVelocity.y * 0.08) *
            step *
            mass,
          z:
            (Math.sin(elapsed * 0.9 + photo.phase * 0.7) * 0.7 -
              angularVelocity.z * 0.08) *
            step *
            mass,
        },
        true,
      );
    });
  });

  return (
    <group ref={setSelectionRoot} name="Photo vortex" {...inspectionHandlers}>
      {photos.map((photo, index) => (
        <RigidBody
          key={photo.name}
          ref={(body) => {
            bodies.current[index] = body;
          }}
          name={photo.name}
          colliders={false}
          position={photo.position}
          rotation={photo.rotation}
          gravityScale={0}
          canSleep={false}
          ccd
          linearDamping={0.58}
          angularDamping={0.82}
          additionalSolverIterations={1}
        >
          <primitive
            object={photo.object}
            dispose={null}
            onClick={(event: ThreeEvent<MouseEvent>) =>
              handleSelect(photo.name, event)
            }
            onPointerOver={() => {
              if (!inspectionActive) document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "default";
            }}
          />
          <CuboidCollider
            args={photo.halfExtents}
            density={0.22}
            friction={0.36}
            restitution={0.1}
          />
        </RigidBody>
      ))}
    </group>
  );
}

function VortexFloor() {
  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={[VORTEX_CENTER.x, VORTEX_MIN_Y - 1.05, VORTEX_CENTER.z]}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 24]} />
        <shadowMaterial
          color="#000000"
          opacity={0.13}
          transparent
          depthWrite={false}
        />
      </mesh>
      <CuboidCollider
        args={[15, 0.12, 12]}
        friction={0.42}
        restitution={0.08}
      />
    </RigidBody>
  );
}

function PhotoVortexContent({
  modelUrl,
  selected,
  onSelected,
}: {
  modelUrl: string;
  selected: string;
  onSelected: (name: string) => void;
}) {
  const { scene } = useGLTF(modelUrl);
  const photos = useMemo(() => preparePhotos(scene), [scene]);
  const selectedPhoto =
    photos.find((photo) => photo.name === selected) ?? photos[0];

  return (
    <>
      <Physics gravity={[0, 0, 0]} timeStep={1 / 60} interpolate>
        <PhotoTornado photos={photos} onSelected={onSelected} />
        <VortexFloor />
      </Physics>
      <SelectedPhotoPreview photo={selectedPhoto} />
    </>
  );
}

export default function PhotoVortexScene({ modelUrl }: { modelUrl: string }) {
  const { viewerOpen } = useSceneInspector();
  const [selectedPhoto, setSelectedPhoto] = useState("photo_tree");
  const handleSelected = useCallback((name: string) => {
    setSelectedPhoto(name);
  }, []);

  return (
    <>
      <div className="absolute inset-y-0 left-1/2 z-20 w-screen -translate-x-1/2">
        <Canvas
          shadows="soft"
          dpr={1}
          frameloop={viewerOpen ? "never" : "always"}
          camera={{ position: [0, 0, 30], fov: 75, near: 0.1, far: 500 }}
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
          }}
        >
          <ambientLight intensity={0.95} />
          <directionalLight
            castShadow
            position={[18, 26, 24]}
            intensity={1.8}
            shadow-mapSize-width={1536}
            shadow-mapSize-height={1536}
            shadow-camera-near={1}
            shadow-camera-far={90}
            shadow-camera-left={-18}
            shadow-camera-right={18}
            shadow-camera-top={24}
            shadow-camera-bottom={-18}
            shadow-bias={-0.0002}
            shadow-normalBias={0.025}
            shadow-radius={4}
          />
          <Suspense fallback={null}>
            <PhotoVortexContent
              modelUrl={modelUrl}
              selected={selectedPhoto}
              onSelected={handleSelected}
            />
            <NeutralEnvironment />
          </Suspense>
          <SmoothOrbitControls
            target={[VORTEX_CENTER.x, VORTEX_CENTER.y, VORTEX_CENTER.z]}
            enableRotate={false}
            enablePan={false}
            enableZoom
            minDistance={20}
            maxDistance={55}
          />
          <SceneOutline />
        </Canvas>
      </div>
      <output className="sr-only" aria-live="polite">
        Selected photo: {selectedPhoto.replace(/^photo_/, "")}
      </output>
    </>
  );
}

useGLTF.preload("/Models/polaroid-layout-transformed.glb");
