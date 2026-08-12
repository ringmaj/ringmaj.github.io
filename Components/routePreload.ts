"use client";

import { getSceneAssets } from "./navigationRoutes";

const startedModels = new Set<string>();
let environmentStarted = false;
let dreiModule: Promise<typeof import("@react-three/drei")> | null = null;

function loadDrei() {
  dreiModule ??= import("@react-three/drei");
  return dreiModule;
}

export function preloadSceneAssets(pathname: string) {
  const models = getSceneAssets(pathname).filter(
    (modelUrl) => !startedModels.has(modelUrl),
  );

  if (models.length === 0) {
    return;
  }

  models.forEach((modelUrl) => startedModels.add(modelUrl));
  const shouldPreloadEnvironment = !environmentStarted;
  environmentStarted = true;

  void loadDrei()
    .then(({ useEnvironment, useGLTF }) => {
      if (shouldPreloadEnvironment) {
        useEnvironment.preload({ files: "/Images/neutral.hdr" });
      }
      models.forEach((modelUrl) => useGLTF.preload(modelUrl));
    })
    .catch(() => {
      models.forEach((modelUrl) => startedModels.delete(modelUrl));
      if (shouldPreloadEnvironment) {
        environmentStarted = false;
      }
    });
}
