import * as THREE from "three";

export type ModelMaterialOverride = {
  color?: THREE.ColorRepresentation;
  metalness?: number;
  roughness?: number;
};

export const MODEL_MATERIAL_OVERRIDES: Record<
  string,
  Record<string, ModelMaterialOverride>
> = {
  "/Models/jet-test-transformed.glb": {
    Fuz18: {
      roughness: 0.4,
    },
  },
};

export function applyModelMaterialOverride(
  modelUrl: string,
  material: THREE.Material,
) {
  if (!(material instanceof THREE.MeshStandardMaterial)) return;
  const override = MODEL_MATERIAL_OVERRIDES[modelUrl]?.[material.name];
  if (!override) return;

  if (override.color !== undefined) material.color.set(override.color);
  if (override.metalness !== undefined)
    material.metalness = override.metalness;
  if (override.roughness !== undefined)
    material.roughness = override.roughness;
  material.needsUpdate = true;
}
