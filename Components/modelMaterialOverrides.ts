import * as THREE from "three";

export type ModelMaterialOverride = {
  color?: THREE.ColorRepresentation;
  metalness?: number;
  roughness?: number;
  normalMapEnabled?: boolean;
  opacity?: number;
  envMapIntensity?: number;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  baseTextureUrl?: string;
  baseTextureEnabled?: boolean;
  useBaseTextureAsEmissiveMap?: boolean;
  baseTextureBrightness?: number;
  baseTextureContrast?: number;
};

export type ModelMaterialApplyOptions = {
  texture?: THREE.Texture;
  installBaseTextureAdjustments?: boolean;
};

const MODEL_OVERRIDE_MAP_FRAGMENT = THREE.ShaderChunk.map_fragment.replace(
  "diffuseColor *= sampledDiffuseColor;",
  `
  sampledDiffuseColor.rgb = max(
    vec3( 0.0 ),
    ( sampledDiffuseColor.rgb - vec3( 0.5 ) ) * modelOverrideMapContrast + vec3( 0.5 )
  );
  sampledDiffuseColor.rgb *= modelOverrideMapBrightness;
  diffuseColor *= sampledDiffuseColor;
  `,
);

export const MODEL_MATERIAL_OVERRIDES: Record<
  string,
  Record<string, ModelMaterialOverride>
> = {
  "/Models/jet-test-transformed.glb": {
    Fuz18: {
      roughness: 0.4,
    },
  },
  "/Models/rmu-transformed.glb": {
    glass: {
      color: "#000000",
      opacity: 0,
    },
    screen: {
      color: "#000000",
      roughness: 0,
      envMapIntensity: 3,
      emissive: "#ffffff",
      emissiveIntensity: 6.3,
      baseTextureUrl: "/Images/radar-mfd-screen-v2.png",
      baseTextureEnabled: false,
      useBaseTextureAsEmissiveMap: true,
      baseTextureBrightness: 1.78,
      baseTextureContrast: 2,
    },
    button_mat: {
      color: "#1a1a1a",
    },
    "metal base": {
      color: "#808080",
      normalMapEnabled: false,
    },
    BRT_BTN: {
      color: "#7a7a7a",
    },
    button_icon: {
      color: "#424242",
    },
  },
};

function installModelBaseTextureAdjustments(
  material: THREE.MeshStandardMaterial,
  brightness: number,
  contrast: number,
) {
  const sourceOnBeforeCompile = material.onBeforeCompile;
  const sourceCustomProgramCacheKey = material.customProgramCacheKey;
  material.onBeforeCompile = (shader, renderer) => {
    sourceOnBeforeCompile.call(material, shader, renderer);
    shader.uniforms.modelOverrideMapBrightness = { value: brightness };
    shader.uniforms.modelOverrideMapContrast = { value: contrast };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <map_pars_fragment>",
        `#include <map_pars_fragment>
uniform float modelOverrideMapBrightness;
uniform float modelOverrideMapContrast;`,
      )
      .replace("#include <map_fragment>", MODEL_OVERRIDE_MAP_FRAGMENT);
  };
  material.customProgramCacheKey = () =>
    `${sourceCustomProgramCacheKey.call(material)}|model-base-texture-${brightness}-${contrast}`;
}

export function getModelMaterialTextureUrl(modelUrl: string) {
  const overrides = MODEL_MATERIAL_OVERRIDES[modelUrl];
  if (!overrides) return null;
  return (
    Object.values(overrides).find((override) => override.baseTextureUrl)
      ?.baseTextureUrl ?? null
  );
}

export function getModelMaterialBaseTextureAdjustments(
  modelUrl: string,
  materialName: string,
) {
  const override = MODEL_MATERIAL_OVERRIDES[modelUrl]?.[materialName];
  return {
    brightness: override?.baseTextureBrightness ?? 1,
    contrast: override?.baseTextureContrast ?? 1,
  };
}

export function applyModelMaterialOverride(
  modelUrl: string,
  material: THREE.Material,
  options: ModelMaterialApplyOptions = {},
) {
  if (!(material instanceof THREE.MeshStandardMaterial)) return;
  const override = MODEL_MATERIAL_OVERRIDES[modelUrl]?.[material.name];
  if (!override) return;

  if (override.color !== undefined) material.color.set(override.color);
  if (override.metalness !== undefined)
    material.metalness = override.metalness;
  if (override.roughness !== undefined)
    material.roughness = override.roughness;
  if (override.normalMapEnabled === false) material.normalMap = null;
  if (override.opacity !== undefined) material.opacity = override.opacity;
  if (override.envMapIntensity !== undefined)
    material.envMapIntensity = override.envMapIntensity;
  if (override.emissive !== undefined) material.emissive.set(override.emissive);
  if (override.emissiveIntensity !== undefined)
    material.emissiveIntensity = override.emissiveIntensity;
  if (override.baseTextureUrl && options.texture) {
    options.texture.flipY = false;
    options.texture.colorSpace = THREE.SRGBColorSpace;
    options.texture.needsUpdate = true;
    material.map = override.baseTextureEnabled === false ? null : options.texture;
    if (override.useBaseTextureAsEmissiveMap) {
      material.emissiveMap = options.texture;
    }
  }
  if (
    options.installBaseTextureAdjustments !== false &&
    (override.baseTextureBrightness !== undefined ||
      override.baseTextureContrast !== undefined)
  ) {
    installModelBaseTextureAdjustments(
      material,
      override.baseTextureBrightness ?? 1,
      override.baseTextureContrast ?? 1,
    );
  }
  material.needsUpdate = true;
}
