"use client";

import React, { useLayoutEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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
const JET_MOBILE_CAMERA_ROTATION = [
  -0.57356,
  0.22735,
  0.14459,
] as const;
const JET_MOBILE_CAMERA_POSITION: [number, number, number] = [
  -1.82289,
  1.87874,
  11.29192,
];

function JetCameraOrientation() {
  const { enabled: positionInfoEnabled } = usePositionInfoMode();
  const { camera, invalidate, size } = useThree();
  const isMobile = size.width <= 640;

  useLayoutEffect(() => {
    if (positionInfoEnabled) return;
    const position = isMobile
      ? JET_MOBILE_CAMERA_POSITION
      : JET_CAMERA_POSITION;
    const rotation = isMobile
      ? JET_MOBILE_CAMERA_ROTATION
      : JET_CAMERA_ROTATION;
    camera.position.set(position[0], position[1], position[2]);
    camera.rotation.set(rotation[0], rotation[1], rotation[2]);
    camera.updateMatrixWorld(true);
    invalidate();
  }, [camera, invalidate, isMobile, positionInfoEnabled]);

  useFrame(() => {
    if (positionInfoEnabled) return;
    const rotation = isMobile
      ? JET_MOBILE_CAMERA_ROTATION
      : JET_CAMERA_ROTATION;
    camera.rotation.set(rotation[0], rotation[1], rotation[2]);
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
