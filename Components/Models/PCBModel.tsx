"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useInspectableObject } from "../SceneInspector";
import SmoothOrbitControls from "../Scenes/SmoothOrbitControls";

export const PCB_MODEL_URL = "/Models/PCB/pcb.gltf";

const PCB_POSITION = new THREE.Vector3(1.59042, 1.73295, -2.32668);
const PCB_ROOT_ROTATION = [0.04973, -0.58991, -0.05447] as const;
const PCB_SHADOW_TARGET_POSITION = new THREE.Vector3(3.65, -0.45, 0);
const PCB_ORBIT_TARGET: [number, number, number] = [
  0.93165, 1.11503, 0.0796,
];
const PCB_ROTATION = [
  THREE.MathUtils.degToRad(16),
  THREE.MathUtils.degToRad(-141),
  THREE.MathUtils.degToRad(0),
] as const;
// The exported GLTF batches disconnected Fusion bodies by material. These are
// the original shaft/joint coordinates in the model, so every moving part must
// be re-parented around this point rather than animated around its own bounds.
const TRAY_PIVOT = new THREE.Vector3(0.008, 1.1, 0);
const TRAY_ATTACHMENT = new THREE.Vector2(-5.837, 4.559);
const DRIVE_PIVOT = new THREE.Vector3(-4.344, -3.6, -7.1);
const CRANK_PIN_REST = new THREE.Vector3(-5.841, -3.592, -7.9);
const DRIVE_RADIUS = Math.hypot(
  CRANK_PIN_REST.x - DRIVE_PIVOT.x,
  CRANK_PIN_REST.y - DRIVE_PIVOT.y,
);
const DRIVE_REST_ANGLE = Math.atan2(
  CRANK_PIN_REST.y - DRIVE_PIVOT.y,
  CRANK_PIN_REST.x - DRIVE_PIVOT.x,
);
const ROCKER_RADIUS = Math.hypot(
  TRAY_ATTACHMENT.x - TRAY_PIVOT.x,
  TRAY_ATTACHMENT.y - TRAY_PIVOT.y,
);
const LINK_LENGTH = Math.hypot(
  TRAY_ATTACHMENT.x - CRANK_PIN_REST.x,
  TRAY_ATTACHMENT.y - CRANK_PIN_REST.y,
);
const ROCKER_REST_ANGLE = Math.atan2(
  TRAY_ATTACHMENT.y - TRAY_PIVOT.y,
  TRAY_ATTACHMENT.x - TRAY_PIVOT.x,
);
const LINK_REST_ANGLE = Math.atan2(
  TRAY_ATTACHMENT.y - CRANK_PIN_REST.y,
  TRAY_ATTACHMENT.x - CRANK_PIN_REST.x,
);
const COMPONENT_MESHES = new Set([
  "PCB_Shaker_v159003",
  "PCB_Shaker_v159003_1",
  "PCB_Shaker_v159003_2",
  "PCB_Shaker_v159003_3",
]);

function createFinish(source: THREE.Material) {
  const name = source.name.toLowerCase();

  if (name.includes("abs") || name.includes("hp_3d")) {
    return new THREE.MeshPhysicalMaterial({
      name: source.name,
      color: "#f2f3f1",
      metalness: 0,
      roughness: 0.42,
      clearcoat: 0.12,
      clearcoatRoughness: 0.34,
      envMapIntensity: 0.78,
    });
  }

  if (name.includes("steel") || name.includes("silver")) {
    return new THREE.MeshStandardMaterial({
      name: source.name,
      color: "#c9ced2",
      metalness: 0.68,
      roughness: 0.3,
      envMapIntensity: 1,
    });
  }

  if (name.includes("red")) {
    return new THREE.MeshStandardMaterial({
      name: source.name,
      color: "#d84832",
      metalness: 0.05,
      roughness: 0.42,
    });
  }

  if (name.includes("black") || name.includes("nylon")) {
    return new THREE.MeshStandardMaterial({
      name: source.name,
      color: name.includes("black") ? "#17191c" : "#34383c",
      metalness: 0,
      roughness: 0.58,
    });
  }

  if (name.includes("copper")) {
    return new THREE.MeshStandardMaterial({
      name: source.name,
      color: "#b66a43",
      metalness: 0.72,
      roughness: 0.32,
    });
  }

  return new THREE.MeshStandardMaterial({
    name: source.name,
    color: "#f4f5f3",
    metalness: 0,
    roughness: 0.42,
  });
}

type GeometryComponent = {
  geometry: THREE.BufferGeometry;
  bounds: THREE.Box3;
};

function createComponentGeometry(
  geometry: THREE.BufferGeometry,
  vertexIndices: number[],
) {
  const component = new THREE.BufferGeometry();

  Object.entries(geometry.attributes).forEach(([name, attribute]) => {
    if (!(attribute instanceof THREE.BufferAttribute)) return;
    const values = new Float32Array(vertexIndices.length * attribute.itemSize);
    vertexIndices.forEach((sourceIndex, targetIndex) => {
      for (let item = 0; item < attribute.itemSize; item += 1) {
        values[targetIndex * attribute.itemSize + item] =
          attribute.array[sourceIndex * attribute.itemSize + item]!;
      }
    });
    component.setAttribute(
      name,
      new THREE.BufferAttribute(values, attribute.itemSize, attribute.normalized),
    );
  });

  component.computeBoundingBox();
  component.computeBoundingSphere();
  return component;
}

function splitGeometryIntoComponents(
  geometry: THREE.BufferGeometry,
): GeometryComponent[] {
  const position = geometry.getAttribute("position");
  if (!position) return [];
  const sourceIndices = geometry.index
    ? Array.from(geometry.index.array)
    : Array.from({ length: position.count }, (_, index) => index);
  const triangleCount = Math.floor(sourceIndices.length / 3);
  const parents = Array.from({ length: triangleCount }, (_, index) => index);
  const positionOwners = new Map<string, number>();

  const find = (value: number): number => {
    const parent = parents[value]!;
    if (parent === value) return value;
    const root = find(parent);
    parents[value] = root;
    return root;
  };
  const union = (first: number, second: number) => {
    const firstRoot = find(first);
    const secondRoot = find(second);
    if (firstRoot !== secondRoot) parents[secondRoot] = firstRoot;
  };

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    for (let corner = 0; corner < 3; corner += 1) {
      const vertexIndex = sourceIndices[triangle * 3 + corner];
      if (vertexIndex === undefined) continue;
      const key = [
        Math.round(position.getX(vertexIndex) * 10000),
        Math.round(position.getY(vertexIndex) * 10000),
        Math.round(position.getZ(vertexIndex) * 10000),
      ].join(",");
      const owner = positionOwners.get(key);
      if (owner === undefined) positionOwners.set(key, triangle);
      else union(triangle, owner);
    }
  }

  const componentIndices = new Map<number, number[]>();
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const root = find(triangle);
    const indices = componentIndices.get(root) ?? [];
    indices.push(
      sourceIndices[triangle * 3]!,
      sourceIndices[triangle * 3 + 1]!,
      sourceIndices[triangle * 3 + 2]!,
    );
    componentIndices.set(root, indices);
  }

  return Array.from(componentIndices.values()).map((indices) => {
    const componentGeometry = createComponentGeometry(geometry, indices);
    return {
      geometry: componentGeometry,
      bounds: componentGeometry.boundingBox!.clone(),
    };
  });
}

function boundsCenter(bounds: THREE.Box3) {
  return bounds.getCenter(new THREE.Vector3());
}

function isTrayComponent(meshName: string, bounds: THREE.Box3) {
  const center = boundsCenter(bounds);

  // Main white tray shell.
  if (meshName === "PCB_Shaker_v159003") return bounds.min.y >= 2.5;

  // The upper side bearing belongs to the tray, not the stationary base.
  const isUpperSideJoint = center.x < -4 && center.y > 3;

  // The three triangular hangers and the bearing outer races share the
  // horizontal tray shaft. They rock with the tray around TRAY_PIVOT.
  const isCentralTrayJoint =
    Math.abs(center.x) < 1.5 &&
    bounds.min.y > -0.15 &&
    bounds.max.y < 3.1 &&
    bounds.min.z > -6.1 &&
    bounds.max.z < 6.1;

  return isUpperSideJoint || isCentralTrayJoint;
}

function isShaftComponent(meshName: string, bounds: THREE.Box3) {
  if (meshName !== "PCB_Shaker_v159003_1") return false;
  const center = boundsCenter(bounds);
  const size = bounds.getSize(new THREE.Vector3());

  // Only the small inner races rotate with the polished shaft. The outer
  // races and triangular bearing hangers remain part of the rocking tray.
  return (
    Math.abs(center.x) < 0.2 &&
    Math.abs(center.y - TRAY_PIVOT.y) < 0.2 &&
    size.x < 1.2 &&
    size.y < 1.2 &&
    Math.abs(center.z) > 2
  );
}

function isLinkageArmComponent(meshName: string, bounds: THREE.Box3) {
  if (meshName !== "PCB_Shaker_v159003_1") return false;
  const center = boundsCenter(bounds);
  const size = bounds.getSize(new THREE.Vector3());

  return center.x < -4 && center.z < -7 && size.y > 8 && size.x < 3;
}

function isDriveCamComponent(meshName: string, bounds: THREE.Box3) {
  if (meshName !== "PCB_Shaker_v159003") return false;
  const center = boundsCenter(bounds);
  const size = bounds.getSize(new THREE.Vector3());

  // The white two-lobed cam is a standalone geometry island. Its smaller
  // right-hand bore is the motor shaft; the larger left lobe carries the
  // eccentric pin that drives the connecting arm.
  return (
    center.x > -5.2 &&
    center.x < -4.7 &&
    center.y > -3.8 &&
    center.y < -3.4 &&
    center.z < -5.8 &&
    size.x > 2 &&
    size.x < 3 &&
    size.y < 1.5
  );
}

function isEccentricBearingComponent(meshName: string, bounds: THREE.Box3) {
  if (
    meshName !== "PCB_Shaker_v159003_1" &&
    meshName !== "PCB_Shaker_v159003_2" &&
    meshName !== "PCB_Shaker_v159003_3"
  ) {
    return false;
  }
  const center = boundsCenter(bounds);
  const size = bounds.getSize(new THREE.Vector3());

  // Steel races plus the red and black bearing inserts at the lower cam pin.
  return (
    center.x > -6.2 &&
    center.x < -5.5 &&
    center.y > -3.9 &&
    center.y < -3.3 &&
    center.z < -7.4 &&
    size.x < 3 &&
    size.y < 3 &&
    size.z < 1
  );
}

function normalizeAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function LoadedPCB({
  controlsRef,
}: {
  controlsRef: React.RefObject<THREE.Group | null>;
}) {
  const { scene: sourceScene } = useGLTF(PCB_MODEL_URL);
  const glassMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        name: "Etching tank glass",
        color: "#eefbfc",
        metalness: 0,
        roughness: 0.16,
        transmission: 0.76,
        thickness: 0.28,
        ior: 1.46,
        transparent: true,
        opacity: 0.42,
        envMapIntensity: 0.9,
        depthWrite: false,
      }),
    [],
  );
  const preparedModel = useMemo(() => {
    const clone = sourceScene.clone(true);
    const finishCache = new Map<THREE.Material, THREE.Material>();
    const ownedMaterials = new Set<THREE.Material>();
    const ownedGeometries = new Set<THREE.BufferGeometry>();
    const componentMeshes: THREE.Mesh[] = [];
    const glassMeshes: THREE.Mesh[] = [];
    const shaftMeshes: THREE.Mesh[] = [];
    const upperAssembly = new THREE.Group();
    upperAssembly.name = "PCB shaker upper tray and bearing hangers";
    upperAssembly.position.copy(TRAY_PIVOT);
    const shaftAssembly = new THREE.Group();
    shaftAssembly.name = "PCB shaker drive shaft";
    shaftAssembly.position.copy(TRAY_PIVOT);
    const linkageArm = new THREE.Group();
    linkageArm.name = "PCB shaker connecting arm";
    linkageArm.position.copy(CRANK_PIN_REST);
    const eccentricBearing = new THREE.Group();
    eccentricBearing.name = "PCB shaker lower eccentric bearing";
    eccentricBearing.position.copy(CRANK_PIN_REST);
    const driveCrank = new THREE.Group();
    driveCrank.name = "PCB shaker eccentric drive crank";
    driveCrank.position.copy(DRIVE_PIVOT);
    clone.userData.zoomable = true;
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = false;
      if (object.name === "PCB_Shaker_v159003_5") {
        object.material = glassMaterial;
        glassMeshes.push(object);
        return;
      }

      const sourceMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      const finishes = sourceMaterials.map((material) => {
        const existing = finishCache.get(material);
        if (existing) return existing;
        const finish = createFinish(material);
        finishCache.set(material, finish);
        ownedMaterials.add(finish);
        return finish;
      });
      object.material = Array.isArray(object.material) ? finishes : finishes[0]!;
      if (COMPONENT_MESHES.has(object.name)) componentMeshes.push(object);
      if (object.name === "PCB_Shaker_v159003_6") shaftMeshes.push(object);
    });

    glassMeshes.forEach((glassMesh) => {
      glassMesh.parent?.remove(glassMesh);
      glassMesh.position.sub(TRAY_PIVOT);
      upperAssembly.add(glassMesh);
    });

    shaftMeshes.forEach((shaftMesh) => {
      shaftMesh.parent?.remove(shaftMesh);
      shaftMesh.position.sub(TRAY_PIVOT);
      shaftAssembly.add(shaftMesh);
    });

    componentMeshes.forEach((mesh) => {
      const parent = mesh.parent;
      const components = splitGeometryIntoComponents(mesh.geometry);
      if (!parent || components.length < 2) return;
      parent.remove(mesh);

      components.forEach(({ geometry, bounds }, index) => {
        ownedGeometries.add(geometry);
        const componentMesh = new THREE.Mesh(geometry, mesh.material);
        componentMesh.name = `${mesh.name}_part_${index}`;
        componentMesh.position.copy(mesh.position);
        componentMesh.quaternion.copy(mesh.quaternion);
        componentMesh.scale.copy(mesh.scale);
        componentMesh.castShadow = true;
        componentMesh.receiveShadow = false;
        componentMesh.userData = { ...mesh.userData };

        if (isDriveCamComponent(mesh.name, bounds)) {
          componentMesh.position.sub(DRIVE_PIVOT);
          driveCrank.add(componentMesh);
        } else if (isEccentricBearingComponent(mesh.name, bounds)) {
          componentMesh.position.sub(CRANK_PIN_REST);
          eccentricBearing.add(componentMesh);
        } else if (isLinkageArmComponent(mesh.name, bounds)) {
          componentMesh.position.sub(CRANK_PIN_REST);
          linkageArm.add(componentMesh);
        } else if (isShaftComponent(mesh.name, bounds)) {
          componentMesh.position.sub(TRAY_PIVOT);
          shaftAssembly.add(componentMesh);
        } else if (isTrayComponent(mesh.name, bounds)) {
          componentMesh.position.sub(TRAY_PIVOT);
          upperAssembly.add(componentMesh);
        } else {
          parent.add(componentMesh);
        }
      });
    });

    clone.add(
      upperAssembly,
      shaftAssembly,
      linkageArm,
      eccentricBearing,
      driveCrank,
    );
    return {
      scene: clone,
      ownedMaterials,
      ownedGeometries,
      upperAssembly,
      shaftAssembly,
      linkageArm,
      eccentricBearing,
      driveCrank,
    };
  }, [glassMaterial, sourceScene]);
  const { inspectionHandlers } = useInspectableObject(preparedModel.scene);

  useEffect(() => () => glassMaterial.dispose(), [glassMaterial]);
  useEffect(
    () => () => {
      preparedModel.ownedMaterials.forEach((material) => material.dispose());
      preparedModel.ownedGeometries.forEach((geometry) => geometry.dispose());
    },
    [preparedModel],
  );

  useFrame(({ clock, invalidate }) => {
    const time = clock.getElapsedTime();
    const phase = time * 10;
    const driveAngle = phase + DRIVE_REST_ANGLE;
    const crankPinX = DRIVE_PIVOT.x + Math.cos(driveAngle) * DRIVE_RADIUS;
    const crankPinY = DRIVE_PIVOT.y + Math.sin(driveAngle) * DRIVE_RADIUS;
    const jointDeltaX = crankPinX - TRAY_PIVOT.x;
    const jointDeltaY = crankPinY - TRAY_PIVOT.y;
    const pivotDistance = Math.hypot(jointDeltaX, jointDeltaY);
    const alongJoint =
      (ROCKER_RADIUS * ROCKER_RADIUS -
        LINK_LENGTH * LINK_LENGTH +
        pivotDistance * pivotDistance) /
      (2 * pivotDistance);
    const perpendicular = Math.sqrt(
      Math.max(0, ROCKER_RADIUS * ROCKER_RADIUS - alongJoint * alongJoint),
    );
    const baseX =
      TRAY_PIVOT.x + (alongJoint * jointDeltaX) / pivotDistance;
    const baseY =
      TRAY_PIVOT.y + (alongJoint * jointDeltaY) / pivotDistance;
    const offsetX = (-perpendicular * jointDeltaY) / pivotDistance;
    const offsetY = (perpendicular * jointDeltaX) / pivotDistance;
    const firstX = baseX + offsetX;
    const firstY = baseY + offsetY;
    const secondX = baseX - offsetX;
    const secondY = baseY - offsetY;
    const firstAngle = Math.atan2(
      firstY - TRAY_PIVOT.y,
      firstX - TRAY_PIVOT.x,
    );
    const secondAngle = Math.atan2(
      secondY - TRAY_PIVOT.y,
      secondX - TRAY_PIVOT.x,
    );
    const firstRotation = normalizeAngle(firstAngle - ROCKER_REST_ANGLE);
    const secondRotation = normalizeAngle(secondAngle - ROCKER_REST_ANGLE);
    const useFirst = Math.abs(firstRotation) < Math.abs(secondRotation);
    const trayJointX = useFirst ? firstX : secondX;
    const trayJointY = useFirst ? firstY : secondY;
    const trayRotation = useFirst ? firstRotation : secondRotation;
    const linkageRotation =
      Math.atan2(trayJointY - crankPinY, trayJointX - crankPinX) -
      LINK_REST_ANGLE;

    preparedModel.shaftAssembly.rotation.z = phase;
    preparedModel.driveCrank.rotation.z = phase;
    preparedModel.upperAssembly.rotation.z = trayRotation;
    preparedModel.linkageArm.position.set(
      crankPinX,
      crankPinY,
      CRANK_PIN_REST.z,
    );
    preparedModel.linkageArm.rotation.z = linkageRotation;
    preparedModel.eccentricBearing.position.set(
      crankPinX,
      crankPinY,
      CRANK_PIN_REST.z,
    );
    preparedModel.eccentricBearing.rotation.z = linkageRotation;
    invalidate();
  });

  return (
    <group position={PCB_POSITION} rotation={PCB_ROOT_ROTATION}>
      <group
        ref={controlsRef}
        scale={0.21}
        rotation={PCB_ROTATION}
        {...inspectionHandlers}
      >
        <primitive object={preparedModel.scene} dispose={null} />
      </group>
    </group>
  );
}

function PCBShadowLight() {
  const target = useMemo(() => {
    const object = new THREE.Object3D();
    object.position.copy(PCB_SHADOW_TARGET_POSITION);
    return object;
  }, []);

  return (
    <>
      <primitive object={target} />
      <directionalLight
        castShadow
        target={target}
        position={[
          PCB_SHADOW_TARGET_POSITION.x + 7,
          PCB_SHADOW_TARGET_POSITION.y + 9,
          PCB_SHADOW_TARGET_POSITION.z + 8,
        ]}
        color="#ffe2c2"
        intensity={1.9}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-camera-left={-4.5}
        shadow-camera-right={4.5}
        shadow-camera-top={4.5}
        shadow-camera-bottom={-4.5}
        shadow-bias={-0.0002}
        shadow-normalBias={0.035}
        shadow-radius={3}
      />
    </>
  );
}

export default function PCBModel() {
  const controlsRef = useRef<THREE.Group>(null);

  return (
    <>
      <ambientLight color="#edf3ff" intensity={0.1} />
      <hemisphereLight
        color="#fff7ed"
        groundColor="#28344a"
        intensity={0.34}
      />
      <PCBShadowLight />
      <directionalLight
        position={[-6, 4, -7]}
        color="#8db6ff"
        intensity={0.62}
      />
      <SmoothOrbitControls
        target={PCB_ORBIT_TARGET}
        rotateObject={controlsRef}
        minDistance={7}
        maxDistance={22}
      />
      <Suspense fallback={null}>
        <LoadedPCB controlsRef={controlsRef} />
      </Suspense>
    </>
  );
}

useGLTF.preload(PCB_MODEL_URL);
