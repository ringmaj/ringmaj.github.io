"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type ComponentRef,
  type RefObject,
} from "react";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { usePositionInfoMode } from "../PositionInfo";
import { useKeyframingMode } from "../Keyframing";
import { useLightingDebug } from "../LightingDebug";

const WHEEL_ZOOM_SENSITIVITY = 0.002;
const WHEEL_ZOOM_DAMPING = 14;

interface SmoothOrbitControlsProps {
  target?: [number, number, number];
  rotateObject?: RefObject<THREE.Object3D | null>;
  rotateObjectVertical?: boolean;
  enableRotate?: boolean;
  enablePan?: boolean;
  enableZoom?: boolean;
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  minZoom?: number;
  maxZoom?: number;
  makeDefault?: boolean;
  rotateRegion?: "all" | "left" | "right";
}

export default function SmoothOrbitControls({
  target = [0, 0, 0],
  rotateObject,
  rotateObjectVertical = true,
  enableRotate = true,
  enablePan = false,
  enableZoom = true,
  minDistance = 0.1,
  maxDistance = Number.POSITIVE_INFINITY,
  minPolarAngle = 0,
  maxPolarAngle = Math.PI,
  minZoom = 0.1,
  maxZoom = Number.POSITIVE_INFINITY,
  makeDefault = true,
  rotateRegion = "all",
}: SmoothOrbitControlsProps) {
  const { enabled: positionInfoEnabled } = usePositionInfoMode();
  const { enabled: keyframingEnabled } = useKeyframingMode();
  const { enabled: lightingDebugEnabled } = useLightingDebug();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera, gl, invalidate } = useThree();
  const targetZoom = useRef(camera.zoom);
  const targetDistance = useRef(0);
  const smoothing = useRef(false);
  const direction = useRef(new THREE.Vector3());
  const debugControlsEnabled = positionInfoEnabled || keyframingEnabled;
  const effectiveEnableRotate = debugControlsEnabled || enableRotate;
  const effectiveEnablePan = debugControlsEnabled || enablePan;
  const effectiveEnableZoom = debugControlsEnabled || enableZoom;
  const effectiveMinDistance = debugControlsEnabled ? 0.01 : minDistance;
  const effectiveMaxDistance = debugControlsEnabled
    ? Number.POSITIVE_INFINITY
    : maxDistance;
  const effectiveMinZoom = positionInfoEnabled ? 0.01 : minZoom;
  const effectiveMaxZoom = positionInfoEnabled
    ? Number.POSITIVE_INFINITY
    : maxZoom;
  const effectiveMinPolarAngle = positionInfoEnabled ? 0 : minPolarAngle;
  const effectiveMaxPolarAngle = positionInfoEnabled
    ? Math.PI
    : maxPolarAngle;

  const syncTarget = useCallback(() => {
    if (smoothing.current || !controls.current) return;
    targetZoom.current = camera.zoom;
    targetDistance.current = camera.position.distanceTo(
      controls.current.target,
    );
  }, [camera]);

  useEffect(() => {
    targetZoom.current = camera.zoom;
    targetDistance.current = controls.current
      ? camera.position.distanceTo(controls.current.target)
      : 0;
    smoothing.current = false;
  }, [camera]);

  useEffect(() => {
    if (
      positionInfoEnabled ||
      lightingDebugEnabled ||
      !enableRotate ||
      !rotateObject
    )
      return;
    const canvas = gl.domElement;
    let pointerId: number | null = null;
    let previousX = 0;
    let previousY = 0;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !rotateObject.current) return;
      const bounds = canvas.getBoundingClientRect();
      const midpoint = bounds.left + bounds.width / 2;
      if (
        (rotateRegion === "left" && event.clientX > midpoint) ||
        (rotateRegion === "right" && event.clientX < midpoint)
      )
        return;
      pointerId = event.pointerId;
      previousX = event.clientX;
      previousY = event.clientY;
      canvas.setPointerCapture(pointerId);
      canvas.style.cursor = "grabbing";
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId || !rotateObject.current) return;
      const deltaX = event.clientX - previousX;
      const deltaY = event.clientY - previousY;
      previousX = event.clientX;
      previousY = event.clientY;
      rotateObject.current.rotation.y += deltaX * 0.006;
      if (rotateObjectVertical) {
        rotateObject.current.rotation.x = THREE.MathUtils.clamp(
          rotateObject.current.rotation.x + deltaY * 0.006,
          -Math.PI / 2,
          Math.PI / 2,
        );
      }
      invalidate();
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      canvas.releasePointerCapture(event.pointerId);
      canvas.style.cursor = "default";
    };

    canvas.style.cursor = "default";
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    return () => {
      canvas.style.cursor = "";
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [
    enableRotate,
    gl,
    invalidate,
    lightingDebugEnabled,
    positionInfoEnabled,
    rotateObject,
    rotateObjectVertical,
    rotateRegion,
  ]);

  useEffect(() => {
    if (!effectiveEnableZoom) return;
    const canvas = gl.domElement;

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0 || !controls.current) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      const pixelDelta =
        event.deltaMode === 1
          ? event.deltaY * 16
          : event.deltaMode === 2
            ? event.deltaY * canvas.clientHeight
            : event.deltaY;
      const boundedDelta = THREE.MathUtils.clamp(pixelDelta, -180, 180);

      if (camera instanceof THREE.OrthographicCamera) {
        const startingZoom = smoothing.current
          ? targetZoom.current
          : camera.zoom;
        targetZoom.current = THREE.MathUtils.clamp(
          startingZoom * Math.exp(-boundedDelta * WHEEL_ZOOM_SENSITIVITY),
          effectiveMinZoom,
          effectiveMaxZoom,
        );
      } else {
        const startingDistance = smoothing.current
          ? targetDistance.current
          : camera.position.distanceTo(controls.current.target);
        targetDistance.current = THREE.MathUtils.clamp(
          startingDistance * Math.exp(boundedDelta * WHEEL_ZOOM_SENSITIVITY),
          effectiveMinDistance,
          effectiveMaxDistance,
        );
      }

      smoothing.current = true;
      invalidate();
    };

    canvas.addEventListener("wheel", handleWheel, {
      passive: false,
      capture: true,
    });
    return () => canvas.removeEventListener("wheel", handleWheel, true);
  }, [
    camera,
    effectiveEnableZoom,
    effectiveMaxDistance,
    effectiveMaxZoom,
    effectiveMinDistance,
    effectiveMinZoom,
    gl,
    invalidate,
  ]);

  useFrame((_, delta) => {
    if (!smoothing.current || !controls.current) return;

    if (camera instanceof THREE.OrthographicCamera) {
      const nextZoom = THREE.MathUtils.damp(
        camera.zoom,
        targetZoom.current,
        WHEEL_ZOOM_DAMPING,
        delta,
      );
      const reachedTarget = Math.abs(nextZoom - targetZoom.current) < 0.002;
      camera.zoom = reachedTarget ? targetZoom.current : nextZoom;
      camera.updateProjectionMatrix();
      if (reachedTarget) smoothing.current = false;
    } else {
      const currentDistance = camera.position.distanceTo(
        controls.current.target,
      );
      const nextDistance = THREE.MathUtils.damp(
        currentDistance,
        targetDistance.current,
        WHEEL_ZOOM_DAMPING,
        delta,
      );
      const reachedTarget =
        Math.abs(nextDistance - targetDistance.current) < 0.002;
      direction.current
        .copy(camera.position)
        .sub(controls.current.target)
        .normalize();
      camera.position
        .copy(controls.current.target)
        .addScaledVector(
          direction.current,
          reachedTarget ? targetDistance.current : nextDistance,
        );
      controls.current.update();
      if (reachedTarget) smoothing.current = false;
    }

    invalidate();
  });

  return (
    <OrbitControls
      ref={controls}
      camera={camera}
      domElement={gl.domElement}
      target={target}
      enableRotate={
        positionInfoEnabled || (effectiveEnableRotate && !rotateObject)
      }
      enablePan={effectiveEnablePan}
      enableZoom={effectiveEnableZoom}
      enableDamping
      dampingFactor={0.08}
      zoomSpeed={1.2}
      minDistance={effectiveMinDistance}
      maxDistance={effectiveMaxDistance}
      minPolarAngle={effectiveMinPolarAngle}
      maxPolarAngle={effectiveMaxPolarAngle}
      minZoom={effectiveMinZoom}
      maxZoom={effectiveMaxZoom}
      makeDefault={makeDefault}
      onChange={syncTarget}
    />
  );
}
