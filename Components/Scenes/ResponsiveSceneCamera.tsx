"use client";

import { useLayoutEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

interface ResponsiveSceneCameraProps {
  mobilePosition?: [number, number, number];
  mobileZoom?: number;
}

export default function ResponsiveSceneCamera({
  mobilePosition,
  mobileZoom,
}: ResponsiveSceneCameraProps) {
  const { camera, invalidate, size } = useThree();
  const desktopCamera = useRef({
    position: camera.position.clone(),
    quaternion: camera.quaternion.clone(),
    zoom: camera.zoom,
  });
  const wasMobile = useRef(false);

  useLayoutEffect(() => {
    const isMobile = size.width <= 640;

    if (isMobile) {
      if (mobilePosition) camera.position.set(...mobilePosition);
      if (mobileZoom !== undefined && camera instanceof THREE.OrthographicCamera) {
        camera.zoom = mobileZoom;
      }
      wasMobile.current = true;
    } else if (wasMobile.current) {
      camera.position.copy(desktopCamera.current.position);
      camera.quaternion.copy(desktopCamera.current.quaternion);
      camera.zoom = desktopCamera.current.zoom;
      wasMobile.current = false;
    }

    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    invalidate();
  }, [camera, invalidate, mobilePosition, mobileZoom, size.width]);

  return null;
}
