"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getNavigationIndex, NAVIGATION_ITEMS } from "./navigationRoutes";
import { preloadRouteModule, preloadSceneAssets } from "./routePreload";

export default function RoutePreloader() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname) return;
    const currentIndex = getNavigationIndex(pathname);
    if (currentIndex === -1) return;

    const nextRoute = NAVIGATION_ITEMS[currentIndex + 1]?.href;
    if (!nextRoute) return;

    // Fetch the route immediately, then let the active page paint before
    // starting the next model decode. Only one future route is warmed so
    // background work cannot contend with the current WebGL scene.
    router.prefetch(nextRoute);
    const warmNext = () => {
      void preloadRouteModule(nextRoute).catch(() => undefined);
      void preloadSceneAssets(nextRoute).catch(() => undefined);
    };
    const idleWindow = window as typeof window & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions,
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(warmNext, {
        timeout: 400,
      });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }
    const timeoutId = window.setTimeout(warmNext, 100);
    return () => window.clearTimeout(timeoutId);
  }, [pathname, router]);

  return null;
}
