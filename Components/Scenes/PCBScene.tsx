"use client";

import { useLayoutEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import PCBModel from "../Models/PCBModel";
import { SceneOutline, useSceneInspector } from "../SceneInspector";
import { usePositionInfoMode } from "../PositionInfo";
import NeutralEnvironment from "./NeutralEnvironment";

const PCB_CAMERA_POSITION: [number, number, number] = [
  -6.16164, 3.7758, 5.9373,
];
const PCB_MOBILE_CAMERA_POSITION: [number, number, number] = [
  -8.40965, 5.3957, 9.74596,
];
const PCB_MOBILE_CAMERA_QUATERNION: [number, number, number, number] = [
  -0.13184, -0.37866, -0.05459, 0.91447,
];

function PCBMobileCamera() {
  const { enabled: positionInfoEnabled } = usePositionInfoMode();
  const { camera, invalidate, size } = useThree();
  const isMobile = size.width <= 640;

  useLayoutEffect(() => {
    if (!isMobile || positionInfoEnabled) return;
    camera.position.set(...PCB_MOBILE_CAMERA_POSITION);
    camera.quaternion.set(...PCB_MOBILE_CAMERA_QUATERNION);
    camera.updateMatrixWorld(true);
    invalidate();
  }, [camera, invalidate, isMobile, positionInfoEnabled]);

  return null;
}

export default function PCBScene() {
  const { viewerOpen } = useSceneInspector();

  return (
    <div className="portfolio-scene-canvas portfolio-scene-pcb absolute inset-0 z-20">
      <Canvas
      shadows="soft"
      dpr={[1, 1.5]}
      frameloop={viewerOpen ? "never" : "demand"}
      performance={{ min: 0.5 }}
      camera={{
        position: PCB_CAMERA_POSITION,
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
        <PCBMobileCamera />
        <NeutralEnvironment intensity={0.22} />
        <SceneOutline />
      </Canvas>
    </div>
  );
}
