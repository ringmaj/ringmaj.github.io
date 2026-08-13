"use client";

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import PCBModel from "../Models/PCBModel";
import { SceneOutline, useSceneInspector } from "../SceneInspector";
import NeutralEnvironment from "./NeutralEnvironment";

export default function PCBScene() {
  const { viewerOpen } = useSceneInspector();

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      frameloop={viewerOpen ? "never" : "demand"}
      performance={{ min: 0.5 }}
      camera={{
        position: [-1.77438, 1.54985, 10.57456],
        fov: 48,
        near: 0.1,
        far: 100,
      }}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.48,
      }}
      style={{
        width: "100vw",
        height: "100vh",
        position: "absolute",
        inset: 0,
      }}
    >
      <PCBModel />
      <mesh
        position={[3.65, -1.9, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[7.5, 7.5]} />
        <shadowMaterial
          color="#000000"
          opacity={0.1}
          transparent
          depthWrite={false}
        />
      </mesh>
      <NeutralEnvironment intensity={0.22} />
      <SceneOutline />
    </Canvas>
  );
}
