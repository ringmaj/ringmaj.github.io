"use client";

import React from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import RadarModel from "../Models/RadarModel";
import NeutralEnvironment from "./NeutralEnvironment";
import { SceneOutline, useSceneInspector } from "../SceneInspector";
import ResponsiveSceneCamera from "./ResponsiveSceneCamera";

const RadarScene = () => {
  const { viewerOpen } = useSceneInspector();

  return (
    <div className="portfolio-scene-canvas portfolio-scene-radar absolute inset-0 z-20">
      <Canvas
      dpr={[1, 1.5]}
      frameloop={viewerOpen ? "never" : "demand"}
      performance={{ min: 0.5 }}
      orthographic
      camera={{
        position: [140.35173, -180.45407, -55.49899],
        zoom: 2.06983,
        near: 0.01,
        far: 1000,
      }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping;
        gl.toneMappingExposure = 1;
      }}
      style={{
        width: "100vw",
        height: "100vh",
        position: "absolute",
        top: 0,
        left: 0,
      }}
      >
        <RadarModel />
        <ResponsiveSceneCamera mobileZoom={0.95} />
        <NeutralEnvironment intensity={0.09} />
        <SceneOutline />
      </Canvas>
    </div>
  );
};

export default RadarScene;
