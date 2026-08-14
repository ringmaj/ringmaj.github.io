"use client";

import React, { Suspense, useEffect, useMemo, useRef } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import SmoothOrbitControls from "../Scenes/SmoothOrbitControls";
import { useInspectableObject } from "../SceneInspector";
import {
  applyModelMaterialOverride,
  getModelMaterialTextureUrl,
} from "../modelMaterialOverrides";

const RADAR_BASE_POSITION: [number, number, number] = [-15, 50, -500];
const RADAR_BASE_ROTATION: [number, number, number] = [
  THREE.MathUtils.degToRad(10),
  THREE.MathUtils.degToRad(50),
  0,
];
const RADAR_MOBILE_SCENE_OFFSET: [number, number, number] = [
  101.82054,
  -30.32563,
  0,
];
const RADAR_FLOAT_SPEED = 0.7;
const RADAR_FLOAT_HEIGHT = 3.5;
const RADAR_FLOAT_DRIFT = 1.2;
const RADAR_FLOAT_TILT = THREE.MathUtils.degToRad(0.4);

const LoadRadarModel = ({
  url,
  group,
}: {
  url: string;
  group: React.RefObject<THREE.Group | null>;
}) => {
  const { scene: sourceScene } = useGLTF(url);
  const isMobile = useThree((state) => state.size.width <= 640);
  const overrideTexture = useTexture(getModelMaterialTextureUrl(url)!);
  const { scene, ownedMaterials } = useMemo(() => {
    const clone = sourceScene.clone(true);
    const materials = new Set<THREE.Material>();

    clone.traverse((object) => {
      if (object instanceof THREE.Light) {
        const isConfiguredSpotlight =
          object instanceof THREE.SpotLight && object.name === "Spot";
        object.visible = isConfiguredSpotlight;
        object.intensity = isConfiguredSpotlight ? 11.67 : 0;
        if (isConfiguredSpotlight) {
          object.color.set("#ffffff");
          object.position.set(4.9749, 3.4675, 4.629);
          object.target.position.set(-296.7693, -41.2036, -762.5355);
          object.target.updateMatrix();
          object.target.updateMatrixWorld(true);
          object.castShadow = true;
          object.angle = Math.PI / 2;
          object.penumbra = 0.47;
          object.distance = 0;
          object.decay = 0;
        }
        return;
      }
      if (!(object instanceof THREE.Mesh)) return;
      const sourceMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      const clonedMaterials = sourceMaterials.map((sourceMaterial) => {
        const material = sourceMaterial.clone();
        applyModelMaterialOverride(url, material, {
          texture: overrideTexture,
        });
        materials.add(material);
        return material;
      });
      object.material = Array.isArray(object.material)
        ? clonedMaterials
        : clonedMaterials[0]!;
    });
    clone.userData.zoomable = true;
    return { scene: clone, ownedMaterials: [...materials] };
  }, [overrideTexture, sourceScene, url]);
  const floatingGroup = useRef<THREE.Group>(null);
  const { inspectionHandlers } = useInspectableObject(scene);

  useFrame(({ clock, invalidate }) => {
    if (!floatingGroup.current) return;
    const phase = clock.getElapsedTime() * RADAR_FLOAT_SPEED;
    floatingGroup.current.position.x =
      RADAR_BASE_POSITION[0] + Math.cos(phase * 0.8) * RADAR_FLOAT_DRIFT;
    floatingGroup.current.position.y =
      RADAR_BASE_POSITION[1] + Math.sin(phase) * RADAR_FLOAT_HEIGHT;
    floatingGroup.current.rotation.x =
      Math.sin(phase * 0.75) * RADAR_FLOAT_TILT;
    floatingGroup.current.rotation.y =
      Math.cos(phase * 0.65) * RADAR_FLOAT_TILT;
    floatingGroup.current.rotation.z =
      Math.sin(phase * 0.55) * RADAR_FLOAT_TILT * 0.6;
    invalidate();
  });

  useEffect(
    () => () => ownedMaterials.forEach((material) => material.dispose()),
    [ownedMaterials],
  );

  return (
    <group position={isMobile ? RADAR_MOBILE_SCENE_OFFSET : [0, 0, 0]}>
      <group
        ref={floatingGroup}
        position={RADAR_BASE_POSITION}
        {...inspectionHandlers}
      >
        <group ref={group} scale={65} rotation={RADAR_BASE_ROTATION}>
          <primitive object={scene} dispose={null} />
        </group>
      </group>
    </group>
  );
};

const RadarModel = () => {
  const radar = useRef<THREE.Group>(null);

  return (
    <>
      <SmoothOrbitControls
        target={[93.98587, 43.75356, -500]}
        rotateObject={radar}
      />
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
useTexture.preload("/Images/radar-mfd-screen-v2.png");
