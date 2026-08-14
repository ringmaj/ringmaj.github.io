"use client";

import React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import JetModel from "../Models/JetModel";
import { SceneOutline, useSceneInspector } from "../SceneInspector";
import { usePositionInfoMode } from "../PositionInfo";

const JET_CAMERA_ROTATION = [
  -0.53358,
  0.38715,
  0.21944,
] as const;
const JET_CAMERA_POSITION: [number, number, number] = [
  0.02671,
  1.78628,
  11.87773,
];

function JetCameraOrientation() {
  const { enabled: positionInfoEnabled } = usePositionInfoMode();

  useFrame(({ camera }) => {
    if (positionInfoEnabled) return;
    camera.rotation.set(...JET_CAMERA_ROTATION);
  });
  return null;
}

const JetScene = () => {
  const { viewerOpen } = useSceneInspector();

  return (
    <div className="portfolio-scene-canvas portfolio-scene-jet absolute inset-0 z-20">
      <Canvas
      dpr={[1, 1.5]}
      frameloop={viewerOpen ? "never" : "demand"}
      performance={{ min: 0.5 }}
      camera={{
        position: JET_CAMERA_POSITION,
        fov: 75,
        near: 0.1,
        far: 1000,
      }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping;
        gl.toneMappingExposure = 1.89;
      }}
      style={{
        width: "100vw",
        height: "100vh",
        position: "absolute",
        top: 0,
        left: 0,
      }}
      >
        <JetModel />
        <JetCameraOrientation />
        <SceneOutline />
      </Canvas>
    </div>
  );
};

export default JetScene;
