"use client";

import { getSceneAssets } from "./navigationRoutes";

const routePreloads = new Map<string, Promise<void>>();
let dreiModule: Promise<typeof import("@react-three/drei")> | null = null;

function loadDrei() {
  dreiModule ??= import("@react-three/drei");
  return dreiModule;
}

function isModelAsset(assetUrl: string) {
  return /\.(?:glb|gltf)(?:\?|$)/i.test(assetUrl);
}

function isTextureAsset(assetUrl: string) {
  return /\.(?:avif|jpe?g|png|webp)(?:\?|$)/i.test(assetUrl);
}

async function warmBrowserCache(assetUrl: string) {
  const response = await fetch(assetUrl, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Unable to preload ${assetUrl}: ${response.status}`);
  }
  await response.arrayBuffer();
}

async function waitForGltfDecode(
  readGltf: (path: string) => unknown,
  assetUrl: string,
) {
  try {
    readGltf(assetUrl);
  } catch (pending) {
    if (pending instanceof Promise) {
      await pending;
      readGltf(assetUrl);
      return;
    }
    throw pending;
  }
}

/**
 * Starts and tracks every network/decode dependency needed by a route.
 * Repeated calls share one promise, so hover, idle preloading, and navigation
 * never duplicate model work.
 */
export function preloadSceneAssets(pathname: string) {
  const existing = routePreloads.get(pathname);
  if (existing) return existing;

  const assets = [...getSceneAssets(pathname)];
  if (assets.length === 0) return Promise.resolve();

  const preload = (async () => {
    const { useEnvironment, useGLTF, useTexture } = await loadDrei();

    useEnvironment.preload({ files: "/Images/neutral.hdr" });

    await Promise.all(
      assets.map(async (assetUrl) => {
        if (isModelAsset(assetUrl)) {
          useGLTF.preload(assetUrl);
          const readGltf = useGLTF as unknown as (path: string) => unknown;
          await waitForGltfDecode(readGltf, assetUrl);
          return;
        } else if (isTextureAsset(assetUrl)) {
          useTexture.preload(assetUrl);
        }
        await warmBrowserCache(assetUrl);
      }),
    );
  })().catch((error) => {
    routePreloads.delete(pathname);
    throw error;
  });

  routePreloads.set(pathname, preload);
  return preload;
}
