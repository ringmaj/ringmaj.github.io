"use client";

import React, { Suspense, useMemo, useRef } from "react";
import { Environment, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import SmoothOrbitControls from "../Scenes/SmoothOrbitControls";
import { useInspectableObject } from "../SceneInspector";
import { applyModelMaterialOverride } from "../modelMaterialOverrides";

const JET_BASE_POSITION = new THREE.Vector3(-2.5, -1.6, 3.5);
const JET_BASE_ROTATION = [0, 0, 0] as const;
const JET_ORBIT_TARGET: [number, number, number] = [
  -4.00854,
  -3.24757,
  3.35643,
];
const FLOAT_POSITION_DELTA = 0.1;
const FLOAT_ROTATION_DELTA = 0.0001;
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

function floatModel(model: THREE.Object3D, time: number, delta: number) {
  const wave = Math.cos(time);
  const positionOffset = wave * FLOAT_POSITION_DELTA;
  const frameScale = Math.min(delta * 60, 2);
  const rotationOffset = wave * FLOAT_ROTATION_DELTA * frameScale;

  model.position.x = JET_BASE_POSITION.x + positionOffset;
  model.position.y = JET_BASE_POSITION.y + positionOffset;
  model.rotateOnAxis(Y_AXIS, rotationOffset);
  model.rotateOnAxis(X_AXIS, rotationOffset);
  model.rotateOnAxis(Z_AXIS, rotationOffset / 2);
}

const LoadJetModel = ({
  url,
  group,
}: {
  url: string;
  group: React.RefObject<THREE.Group | null>;
}) => {
  const { scene: sourceScene } = useGLTF(url);
  const gl = useThree((state) => state.gl);
  const scene = useMemo(() => {
    const clone = sourceScene.clone(true);
    const anisotropy = Math.min(gl.capabilities.getMaxAnisotropy(), 8);
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => {
        if (!(material instanceof THREE.MeshStandardMaterial)) return;
        if (material.name.toLowerCase() === "fuz18") {
          material.roughness = 0.7;
          material.metalness = 0.05;
          material.roughnessMap = null;
          material.metalnessMap = null;
          material.aoMapIntensity = 0.85;
          material.envMapIntensity = 1;
          material.needsUpdate = true;
        }
        applyModelMaterialOverride(
          "/Models/jet-test-transformed.glb",
          material,
        );
        [
          material.map,
          material.normalMap,
          material.roughnessMap,
          material.metalnessMap,
          material.emissiveMap,
          material.aoMap,
        ].forEach((texture) => {
          if (!texture || texture.anisotropy === anisotropy) return;
          texture.anisotropy = anisotropy;
          texture.needsUpdate = true;
        });
      });
    });
    clone.userData.zoomable = true;
    return clone;
  }, [gl, sourceScene]);
  const floatingGroup = useRef<THREE.Group>(null);
  const { inspectionHandlers } = useInspectableObject(scene);

  useFrame(({ clock, invalidate }, delta) => {
    if (!floatingGroup.current) return;
    floatModel(floatingGroup.current, clock.getElapsedTime(), delta);
    invalidate();
  });

  return (
    <group
      ref={floatingGroup}
      position={JET_BASE_POSITION}
      rotation={JET_BASE_ROTATION}
      {...inspectionHandlers}
    >
      <group ref={group} scale={0.9}>
        <primitive object={scene} dispose={null} />
      </group>
    </group>
  );
};

const JetModel = () => {
  const jet = useRef<THREE.Group>(null);

  return (
    <>
      <ambientLight color="#fff4e8" intensity={0.22} />
      <hemisphereLight
        color="#fff7ed"
        groundColor="#29344b"
        intensity={0.45}
      />
      <directionalLight
        position={[100, 20, 30]}
        intensity={4}
        color="#ffc27d"
      />
      <directionalLight
        position={[0, 20, -50]}
        intensity={1.5}
        color="#ff8a3d"
      />
      <Environment preset="apartment" environmentIntensity={1.25} />
      <SmoothOrbitControls target={JET_ORBIT_TARGET} rotateObject={jet} />
      <Suspense fallback={null}>
        <LoadJetModel url="/Models/jet-test-transformed.glb" group={jet} />
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

export default JetModel;

useGLTF.preload("/Models/jet-test-transformed.glb");
