"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getNavigationIndex,
  NAVIGATION_ITEMS,
} from "./navigationRoutes";
import { preloadSceneAssets } from "./routePreload";

function scheduleWhenIdle(callback: () => void, delay: number) {
  let idleHandle: number | undefined;
  let fallbackHandle: number | undefined;
  const timeoutHandle = window.setTimeout(() => {
    if (typeof window.requestIdleCallback === "function") {
      idleHandle = window.requestIdleCallback(callback, { timeout: 1200 });
    } else {
      fallbackHandle = window.setTimeout(callback, 0);
    }
  }, delay);

  return () => {
    window.clearTimeout(timeoutHandle);
    if (
      idleHandle !== undefined &&
      typeof window.cancelIdleCallback === "function"
    ) {
      window.cancelIdleCallback(idleHandle);
    }
    if (fallbackHandle !== undefined) {
      window.clearTimeout(fallbackHandle);
    }
  };
}

export default function RoutePreloader() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const currentIndex = getNavigationIndex(pathname);
    if (currentIndex === -1) return;

    const nextRoute = NAVIGATION_ITEMS[currentIndex + 1]?.href;
    const previousRoute = NAVIGATION_ITEMS[currentIndex - 1]?.href;
    const adjacentRoutes = [nextRoute, previousRoute].filter(
      (route) => route !== undefined,
    );

    adjacentRoutes.forEach((route) => router.prefetch(route));

    const cancelNext = nextRoute
      ? scheduleWhenIdle(() => preloadSceneAssets(nextRoute), 80)
      : undefined;
    const cancelPrevious = previousRoute
      ? scheduleWhenIdle(() => preloadSceneAssets(previousRoute), 1800)
      : undefined;

    return () => {
      cancelNext?.();
      cancelPrevious?.();
    };
  }, [pathname, router]);

  return null;
}
