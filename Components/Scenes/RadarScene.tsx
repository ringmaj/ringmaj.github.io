"use client";

import React from "react";
import { Canvas } from "@react-three/fiber";
import RadarModel from "../Models/RadarModel";
import NeutralEnvironment from "./NeutralEnvironment";
import { SceneOutline, useSceneInspector } from "../SceneInspector";

const RadarScene = () => {
  const { viewerOpen } = useSceneInspector();

  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={viewerOpen ? "never" : "demand"}
      performance={{ min: 0.5 }}
      orthographic
      camera={{
        position: [93.98587, 43.75356, 0],
        zoom: 2.06983,
        near: 0.01,
        far: 1000,
      }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{
        width: "100vw",
        height: "100vh",
        position: "absolute",
        top: 0,
        left: 0,
      }}
    >
      <RadarModel />
      <NeutralEnvironment />
      <SceneOutline />
    </Canvas>
  );
};

export default RadarScene;
