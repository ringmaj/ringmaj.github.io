"use client";

import React, { Suspense, useEffect, useMemo, useRef } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import SmoothOrbitControls from "../Scenes/SmoothOrbitControls";
import { useInspectableObject } from "../SceneInspector";
import {
  applyModelMaterialOverride,
  getModelMaterialTextureUrl,
} from "../modelMaterialOverrides";

const LoadRadarModel = ({
  url,
  group,
}: {
  url: string;
  group: React.RefObject<THREE.Group | null>;
}) => {
  const { scene: sourceScene } = useGLTF(url);
  const overrideTexture = useTexture(getModelMaterialTextureUrl(url)!);
  const { scene, ownedMaterials } = useMemo(() => {
    const clone = sourceScene.clone(true);
    const materials = new Set<THREE.Material>();

    clone.traverse((object) => {
      if (object instanceof THREE.Light) {
        const isConfiguredSpotlight =
          object instanceof THREE.SpotLight && object.name === "Spot";
        object.visible = isConfiguredSpotlight;
        object.intensity = isConfiguredSpotlight ? 20 : 0;
        if (isConfiguredSpotlight) {
          object.color.set("#ffffff");
          object.position.set(4.9749, 3.4675, 4.629);
          object.target.position.set(-296.7693, -41.2036, -762.5355);
          object.target.updateMatrix();
          object.target.updateMatrixWorld(true);
          object.castShadow = true;
          object.angle = Math.PI / 2;
          object.penumbra = 0.19;
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
  const { inspectionHandlers } = useInspectableObject(scene);

  useEffect(
    () => () => ownedMaterials.forEach((material) => material.dispose()),
    [ownedMaterials],
  );

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
