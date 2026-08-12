"use client";

import React, { Suspense, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import SmoothOrbitControls from "../Scenes/SmoothOrbitControls";
import { useInspectableObject } from "../SceneInspector";

const LoadRadarModel = ({
  url,
  group,
}: {
  url: string;
  group: React.RefObject<THREE.Group | null>;
}) => {
  const { scene: sourceScene } = useGLTF(url);
  const scene = useMemo(() => {
    const clone = sourceScene.clone(true);
    clone.userData.zoomable = true;
    return clone;
  }, [sourceScene]);
  const { inspectionHandlers } = useInspectableObject(scene);

  return (
    <group
      ref={group}
      scale={65}
      position={[-15, 50, -500]}
      rotation={[THREE.MathUtils.degToRad(10), THREE.MathUtils.degToRad(50), 0]}
      {...inspectionHandlers}
    >
      <primitive object={scene} dispose={null} />
    </group>
  );
};

const RadarModel = () => {
  const radar = useRef<THREE.Group>(null);

  return (
    <>
      <ambientLight color={"blue"} intensity={1} />
      <directionalLight
        position={[100, 20, 30]}
        intensity={20}
        color={"#ffddb9"}
      />
      <directionalLight
        position={[0, 20, 10]}
        intensity={0.5}
        color={"#ffa546"}
      />
      <SmoothOrbitControls target={[275, 0, -500]} rotateObject={radar} />
      <Suspense fallback={null}>
        <LoadRadarModel url="/Models/rmu-transformed.glb" group={radar} />
      </Suspense>
      {/* <EffectComposer>
        <Bloom
          intensity={0.6} // The bloom intensity.
          blurPass={undefined} // A blur pass.
          kernelSize={KernelSize.LARGE} // blur kernel size
          luminanceThreshold={0.9} // luminance threshold. Raise this value to mask out darker elements in the scene.
          luminanceSmoothing={0.025} // smoothness of the luminance threshold. Range is [0, 1]
          mipmapBlur={false} // Enables or disables mipmap blur.
          resolutionX={Resolution.AUTO_SIZE} // The horizontal resolution.
          resolutionY={Resolution.AUTO_SIZE} // The vertical resolution.
        />
      </EffectComposer> */}
    </>
  );
};

export default RadarModel;

useGLTF.preload("/Models/rmu-transformed.glb");
