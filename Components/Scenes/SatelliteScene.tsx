"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";
import NeutralEnvironment from "./NeutralEnvironment";
import SmoothOrbitControls from "./SmoothOrbitControls";
import {
  SceneOutline,
  useInspectableObject,
  useSceneInspector,
} from "../SceneInspector";

const STAR_COUNT = 3000;
const SATELLITE_NORMAL_SCALE = 2.8;
const SATELLITE_FLOAT_AMPLITUDE = 0.035;
const SATELLITE_FLOAT_SPEED = 0.55;
const SATELLITE_ROTATION_SPEED = 0.006;

const STAR_VERTEX_SHADER = `
  attribute float starSize;
  attribute float starBrightness;
  varying float vBrightness;

  void main() {
    vBrightness = starBrightness;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewPosition;

    float depthScale = clamp(
      180.0 / max(80.0, -viewPosition.z),
      0.75,
      1.75
    );
    gl_PointSize = clamp(starSize * depthScale, 1.5, 9.0);
  }
`;

const STAR_FRAGMENT_SHADER = `
  varying float vBrightness;

  void main() {
    float distanceFromCenter = distance(gl_PointCoord, vec2(0.5));
    float glow = 1.0 - smoothstep(0.16, 0.5, distanceFromCenter);
    float core = 1.0 - smoothstep(0.0, 0.16, distanceFromCenter);
    float alpha = min(
      1.0,
      (glow * 0.9 + core * 0.75) * vBrightness
    );

    if (alpha < 0.01) discard;
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
  }
`;

function StarField() {
  const group = useRef<THREE.Group>(null);
  const { positions, sizes, brightness } = useMemo(() => {
    const nextPositions = new Float32Array(STAR_COUNT * 3);
    const nextSizes = new Float32Array(STAR_COUNT);
    const nextBrightness = new Float32Array(STAR_COUNT);
    let seed = 173;

    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let index = 0; index < STAR_COUNT; index += 1) {
      nextPositions[index * 3] = random() * 1000 - 500;
      nextPositions[index * 3 + 1] = random() * 1000 - 500;
      nextPositions[index * 3 + 2] = random() * 1000 - 500;

      const sizeTier = random();
      if (sizeTier < 0.68) {
        nextSizes[index] = 1.6 + random() * 0.8;
        nextBrightness[index] = 0.75 + random() * 0.2;
      } else if (sizeTier < 0.93) {
        nextSizes[index] = 2.8 + random() * 1.6;
        nextBrightness[index] = 0.82 + random() * 0.18;
      } else {
        nextSizes[index] = 5.2 + random() * 2.8;
        nextBrightness[index] = 0.95 + random() * 0.05;
      }
    }

    return {
      positions: nextPositions,
      sizes: nextSizes,
      brightness: nextBrightness,
    };
  }, []);
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: STAR_VERTEX_SHADER,
      fragmentShader: STAR_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.006;
  });

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-starSize" args={[sizes, 1]} />
          <bufferAttribute
            attach="attributes-starBrightness"
            args={[brightness, 1]}
          />
        </bufferGeometry>
        <primitive object={material} attach="material" />
      </points>
    </group>
  );
}

function SatelliteModel({
  modelUrl,
  group,
}: {
  modelUrl: string;
  group: React.RefObject<THREE.Group | null>;
}) {
  const { scene: sourceScene, animations } = useGLTF(modelUrl);
  const isMobile = useThree((state) => state.size.width <= 640);
  const { scene, ownedMaterials } = useMemo(() => {
    const clone = cloneSkinned(sourceScene);
    const materialClones = new Map<THREE.Material, THREE.Material>();
    const prepareMaterial = (source: THREE.Material) => {
      let material = materialClones.get(source);
      if (!material) {
        material = source.clone();
        if (
          material instanceof THREE.MeshStandardMaterial &&
          material.normalMap
        ) {
          material.normalScale.set(
            SATELLITE_NORMAL_SCALE,
            SATELLITE_NORMAL_SCALE,
          );
        }
        materialClones.set(source, material);
      }
      return material;
    };

    clone.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.material = Array.isArray(child.material)
        ? child.material.map(prepareMaterial)
        : prepareMaterial(child.material);
    });
    clone.name = "Orbital Satellite";
    clone.userData.zoomable = true;
    return {
      scene: clone,
      ownedMaterials: [...materialClones.values()],
    };
  }, [sourceScene]);
  const { actions } = useAnimations(animations, group);
  const { inspectionHandlers } = useInspectableObject(scene);

  useEffect(
    () => () => {
      ownedMaterials.forEach((material) => material.dispose());
    },
    [ownedMaterials],
  );

  useEffect(() => {
    const firstAction = Object.values(actions)[0];
    if (!firstAction) return;

    firstAction.reset().setLoop(THREE.LoopOnce, 1);
    firstAction.clampWhenFinished = true;
    firstAction.play();

    return () => {
      firstAction.stop();
    };
  }, [actions]);

  useEffect(
    () => () => {
      document.body.style.cursor = "default";
    },
    [],
  );

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    group.current.position.y =
      Math.sin(clock.elapsedTime * SATELLITE_FLOAT_SPEED) *
      SATELLITE_FLOAT_AMPLITUDE;
    group.current.rotation.y += delta * SATELLITE_ROTATION_SPEED;
  });

  return (
    <group
      ref={group}
      position={[isMobile ? 0 : -1.5, 0, 0]}
      scale={isMobile ? 0.68 : 1}
      rotation={[0, THREE.MathUtils.degToRad(65), 0]}
      onPointerEnter={() => {
        document.body.style.cursor = "default";
      }}
      onPointerLeave={() => {
        document.body.style.cursor = "default";
      }}
      {...inspectionHandlers}
    >
      <primitive object={scene} dispose={null} />
    </group>
  );
}

export default function SatelliteScene({ modelUrl }: { modelUrl: string }) {
  const satellite = useRef<THREE.Group>(null);
  const { viewerOpen } = useSceneInspector();

  return (
    <>
      <div
        className="absolute top-0 left-1/2 z-0 w-screen -translate-x-1/2 bg-black"
        style={{ height: "calc(100% / 0.95)" }}
      />
      <div
        className="portfolio-scene-canvas portfolio-scene-satellite absolute top-0 left-1/2 z-20 w-screen -translate-x-1/2"
        style={{ height: "calc(100% / 0.95)" }}
      >
        <Canvas
          dpr={1}
          frameloop={viewerOpen ? "never" : "always"}
          camera={{ position: [0, 1, 5], fov: 75, near: 0.1, far: 2000 }}
          gl={{
            antialias: false,
            alpha: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.35,
          }}
        >
          <ambientLight intensity={0.45} />
          <hemisphereLight
            color="#dbeafe"
            groundColor="#050816"
            intensity={1.1}
          />
          <pointLight
            position={[-1.5, 2, 5]}
            color="#ffffff"
            intensity={22}
            distance={18}
            decay={2}
          />
          <directionalLight
            position={[-5, 1, -4]}
            color="#7aa2ff"
            intensity={0.45}
          />
          <Suspense fallback={null}>
            <NeutralEnvironment />
            <StarField />
            <SatelliteModel modelUrl={modelUrl} group={satellite} />
          </Suspense>
          <SmoothOrbitControls
            minDistance={3}
            maxDistance={9}
            target={[0, 1, 0]}
            rotateObject={satellite}
          />
          <SceneOutline />
        </Canvas>
      </div>
    </>
  );
}

useGLTF.preload("/Models/orbital-space-satellite-transformed.glb");
