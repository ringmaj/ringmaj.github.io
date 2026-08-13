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
  metalnessTextureUrl?: string;
  bumpTextureUrl?: string;
  baseTextureEnabled?: boolean;
  useBaseTextureAsEmissiveMap?: boolean;
  baseTextureBrightness?: number;
  baseTextureContrast?: number;
  bumpScale?: number;
};

export type ModelMaterialApplyOptions = {
  texture?: THREE.Texture;
  metalnessTexture?: THREE.Texture;
  bumpTexture?: THREE.Texture;
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
  "/Models/pcb-etched.glb": {
    board: {
      opacity: 0.94,
    },
    "pcb-texture": {
      color: "#cde759",
      metalness: 1,
      roughness: 0.21,
      baseTextureUrl: "/Images/pcb-etched/pcb-copper-texture.png",
      metalnessTextureUrl: "/Images/pcb-etched/pcb-etch-texture.png",
      bumpTextureUrl: "/Images/pcb-etched/pcb-etch-roughness.png",
      bumpScale: -10,
    },
  },
};

export function getModelMaterialTextureUrls(modelUrl: string) {
  const overrides = MODEL_MATERIAL_OVERRIDES[modelUrl];
  const values = Object.values(overrides ?? {});
  return {
    base:
      values.find((override) => override.baseTextureUrl)?.baseTextureUrl ??
      null,
    metalness:
      values.find((override) => override.metalnessTextureUrl)
        ?.metalnessTextureUrl ?? null,
    bump:
      values.find((override) => override.bumpTextureUrl)?.bumpTextureUrl ??
      null,
  };
}

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
  return getModelMaterialTextureUrls(modelUrl).base;
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
  if (override.opacity !== undefined && override.opacity < 1) {
    material.transparent = true;
  }
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
  if (override.metalnessTextureUrl && options.metalnessTexture) {
    options.metalnessTexture.flipY = false;
    options.metalnessTexture.colorSpace = THREE.NoColorSpace;
    options.metalnessTexture.needsUpdate = true;
    material.metalnessMap = options.metalnessTexture;
  }
  if (override.bumpTextureUrl && options.bumpTexture) {
    options.bumpTexture.flipY = false;
    options.bumpTexture.colorSpace = THREE.NoColorSpace;
    options.bumpTexture.needsUpdate = true;
    material.bumpMap = options.bumpTexture;
  }
  if (override.bumpScale !== undefined) material.bumpScale = override.bumpScale;
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
