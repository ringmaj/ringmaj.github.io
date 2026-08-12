"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import SmoothOrbitControls from "./SmoothOrbitControls";
import NeutralEnvironment from "./NeutralEnvironment";
import {
  SceneOutline,
  useInspectableObject,
  useSceneInspector,
} from "../SceneInspector";

function ShowcaseModel({
  modelUrl,
  group,
}: {
  modelUrl: string;
  group: React.RefObject<THREE.Group | null>;
}) {
  const { scene: sourceScene } = useGLTF(modelUrl);
  const scene = useMemo(() => sourceScene.clone(true), [sourceScene]);
  const { inspectionHandlers } = useInspectableObject(scene);

  return (
    <group ref={group} {...inspectionHandlers}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}

export default function ShowcaseScene({ modelUrl }: { modelUrl: string }) {
  const model = useRef<THREE.Group>(null);
  const { viewerOpen } = useSceneInspector();

  return (
    <div className="absolute inset-y-0 left-1/2 z-20 w-screen -translate-x-1/2">
      <Canvas
        dpr={[1, 1.5]}
        frameloop={viewerOpen ? "never" : "demand"}
        performance={{ min: 0.5 }}
        camera={{ position: [5, 3, 7], fov: 42 }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[6, 8, 6]} intensity={3} />
        <Suspense fallback={null}>
          <Bounds fit clip observe={false} margin={1.3}>
            <ShowcaseModel modelUrl={modelUrl} group={model} />
          </Bounds>
          <NeutralEnvironment />
        </Suspense>
        <SmoothOrbitControls rotateObject={model} />
        <SceneOutline />
      </Canvas>
    </div>
  );
}
