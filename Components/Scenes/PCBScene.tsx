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
      shadows="soft"
      dpr={[1, 1.5]}
      frameloop={viewerOpen ? "never" : "demand"}
      performance={{ min: 0.5 }}
      camera={{
        position: [-6.16164, 3.7758, 5.9373],
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
      <NeutralEnvironment intensity={0.22} />
      <SceneOutline />
    </Canvas>
  );
}
