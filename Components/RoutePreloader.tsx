"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getNavigationIndex, NAVIGATION_ITEMS } from "./navigationRoutes";
import { preloadSceneAssets } from "./routePreload";

export default function RoutePreloader() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname) return;
    const currentIndex = getNavigationIndex(pathname);
    if (currentIndex === -1) return;

    const nextRoute = NAVIGATION_ITEMS[currentIndex + 1]?.href;
    const previousRoute = NAVIGATION_ITEMS[currentIndex - 1]?.href;

    // Give the forward page the whole time the user spends on this page to
    // fetch its route bundle, download assets, and decode GLTFs. This begins
    // immediately after mount and is never awaited by carousel navigation.
    if (nextRoute) {
      router.prefetch(nextRoute);
      void preloadSceneAssets(nextRoute).catch(() => undefined);
    }

    // A directly opened middle page can still move backward, but that preload
    // must not compete with the forward scene. Pages already visited are in
    // cache, so idle warming is enough for this less common cold-load case.
    if (!previousRoute) return;
    const preloadPrevious = () => {
      router.prefetch(previousRoute);
      void preloadSceneAssets(previousRoute).catch(() => undefined);
    };
    const idleWindow = window as typeof window & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions,
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(preloadPrevious, {
        timeout: 2500,
      });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }
    const timeoutId = window.setTimeout(preloadPrevious, 1500);
    return () => window.clearTimeout(timeoutId);
  }, [pathname, router]);

  return null;
}
