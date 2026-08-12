"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { NAVIGATION_ITEMS } from "./navigationRoutes";
import { preloadSceneAssets } from "./routePreload";
import { usePositionInfoMode } from "./PositionInfo";
import { useKeyframingMode } from "./Keyframing";

const WHEEL_THRESHOLD = 52;
const WHEEL_GESTURE_GAP = 150;
const WHEEL_INERTIA_GUARD = 260;
const TOUCH_THRESHOLD = 58;
const ROUTE_COMMIT_TIMEOUT = 5000;
const FALLBACK_EXIT_DURATION = 180;
const FALLBACK_ENTER_DURATION = 320;

type PageDirection = "next" | "previous";

interface PageNavigationContextValue {
  navigateBy: (offset: -1 | 1) => void;
  navigateToPage: (page: string) => void;
  primePage: (page: string) => void;
}

interface PendingRoute {
  target: string;
  resolve: () => void;
  timeout: number;
}

const PageNavigationContext = createContext<PageNavigationContextValue | null>(
  null,
);

function wait(duration: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, duration));
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "input, textarea, select, button, a, [contenteditable='true'], [data-page-navigation-ignore]",
    ),
  );
}

function isModelInspectorOpen() {
  return Boolean(document.documentElement.dataset.modelInspector);
}

function setTransitionState(
  direction: PageDirection,
  state: "leaving" | "entering" | null,
) {
  const root = document.documentElement;
  root.dataset.pageDirection = direction;
  if (state) root.dataset.pageTransition = state;
  else delete root.dataset.pageTransition;
}

function clearTransitionState() {
  delete document.documentElement.dataset.pageDirection;
  delete document.documentElement.dataset.pageTransition;
}

export default function PageNavigationController({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { enabled: positionInfoEnabled } = usePositionInfoMode();
  const { enabled: keyframingEnabled } = useKeyframingMode();
  const pathnameRef = useRef(pathname);
  const navigationLock = useRef(false);
  const pendingRoute = useRef<PendingRoute | null>(null);
  const wheelBlockedUntil = useRef(0);
  const wheelGesture = useRef({ delta: 0, direction: 0, timestamp: 0 });
  const touchGesture = useRef({ x: 0, y: 0, triggered: false });

  pathnameRef.current = pathname;

  useEffect(() => {
    const pending = pendingRoute.current;
    if (!pending || pending.target !== pathname) return;

    window.clearTimeout(pending.timeout);
    pendingRoute.current = null;
    pending.resolve();
  }, [pathname]);

  useEffect(
    () => () => {
      const pending = pendingRoute.current;
      if (pending) {
        window.clearTimeout(pending.timeout);
        pending.resolve();
      }
      clearTransitionState();
    },
    [],
  );

  const primePage = useCallback(
    (page: string) => {
      if (!NAVIGATION_ITEMS.some((item) => item.href === page)) return;
      router.prefetch(page);
      void preloadSceneAssets(page).catch(() => undefined);
    },
    [router],
  );

  const commitRoute = useCallback(
    (target: string) =>
      new Promise<void>((resolve) => {
        const finish = () => {
          if (pendingRoute.current?.target === target) {
            pendingRoute.current = null;
          }
          resolve();
        };
        const timeout = window.setTimeout(finish, ROUTE_COMMIT_TIMEOUT);
        pendingRoute.current = { target, resolve: finish, timeout };
        router.push(target, { scroll: false });
      }),
    [router],
  );

  const navigateToPage = useCallback(
    (target: string) => {
      if (navigationLock.current || target === pathnameRef.current) return;

      const currentIndex = NAVIGATION_ITEMS.findIndex(
        (item) => item.href === pathnameRef.current,
      );
      const targetIndex = NAVIGATION_ITEMS.findIndex(
        (item) => item.href === target,
      );
      if (currentIndex === -1 || targetIndex === -1) {
        router.push(target);
        return;
      }

      const direction: PageDirection =
        targetIndex > currentIndex ? "next" : "previous";
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      navigationLock.current = true;
      wheelGesture.current.delta = 0;
      // Navigation must never wait for asset loading. RoutePreloader starts
      // warming the forward page when the current route mounts; this is only
      // a non-blocking safety net for direct jumps and unusually fast input.
      primePage(target);
      setTransitionState(direction, null);

      void (async () => {
        try {
          if (reduceMotion) {
            await commitRoute(target);
          } else {
            // Native View Transitions impose a short DOM-update deadline.
            // Heavy WebGL routes can miss it while React swaps Canvas/physics
            // trees, which surfaces as an unhandled TimeoutError and can leave
            // the tab unresponsive. The transform carousel below renders the
            // same vertical movement without snapshotting the WebGL surface.
            setTransitionState(direction, "leaving");
            await wait(FALLBACK_EXIT_DURATION);
            await commitRoute(target);
            setTransitionState(direction, "entering");
            await wait(FALLBACK_ENTER_DURATION);
          }
        } catch {
          if (pathnameRef.current !== target) {
            await commitRoute(target);
          }
        } finally {
          clearTransitionState();
          navigationLock.current = false;
          wheelBlockedUntil.current = performance.now() + WHEEL_INERTIA_GUARD;
        }
      })();
    },
    [commitRoute, primePage, router],
  );

  const navigateBy = useCallback(
    (offset: -1 | 1) => {
      const currentIndex = NAVIGATION_ITEMS.findIndex(
        (item) => item.href === pathnameRef.current,
      );
      if (currentIndex === -1) return;
      const target = NAVIGATION_ITEMS[currentIndex + offset];
      if (target) navigateToPage(target.href);
    },
    [navigateToPage],
  );

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (positionInfoEnabled || keyframingEnabled) return;
      if (isModelInspectorOpen()) return;
      if (event.ctrlKey || Math.abs(event.deltaY) < Math.abs(event.deltaX)) {
        return;
      }
      if (
        NAVIGATION_ITEMS.findIndex(
          (item) => item.href === pathnameRef.current,
        ) === -1
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const now = performance.now();
      if (navigationLock.current || now < wheelBlockedUntil.current) return;

      const normalizedDelta =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? event.deltaY * 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? event.deltaY * window.innerHeight
            : event.deltaY;
      const direction = Math.sign(normalizedDelta);
      const gesture = wheelGesture.current;

      if (
        now - gesture.timestamp > WHEEL_GESTURE_GAP ||
        direction !== gesture.direction
      ) {
        gesture.delta = 0;
      }

      gesture.timestamp = now;
      gesture.direction = direction;
      gesture.delta += normalizedDelta;

      if (Math.abs(gesture.delta) >= WHEEL_THRESHOLD) {
        gesture.delta = 0;
        navigateBy(direction > 0 ? 1 : -1);
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (positionInfoEnabled || keyframingEnabled) return;
      if (isModelInspectorOpen()) return;
      if (event.touches.length !== 1) return;
      touchGesture.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
        triggered: false,
      };
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (positionInfoEnabled || keyframingEnabled) return;
      if (isModelInspectorOpen()) return;
      if (event.touches.length !== 1 || touchGesture.current.triggered) return;
      if (
        NAVIGATION_ITEMS.findIndex(
          (item) => item.href === pathnameRef.current,
        ) === -1
      ) {
        return;
      }

      const deltaX = event.touches[0].clientX - touchGesture.current.x;
      const deltaY = event.touches[0].clientY - touchGesture.current.y;
      if (Math.abs(deltaY) <= Math.abs(deltaX) || Math.abs(deltaY) < 8) return;

      event.preventDefault();
      event.stopPropagation();
      if (Math.abs(deltaY) < TOUCH_THRESHOLD || navigationLock.current) return;

      touchGesture.current.triggered = true;
      navigateBy(deltaY < 0 ? 1 : -1);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (positionInfoEnabled || keyframingEnabled) return;
      if (isModelInspectorOpen()) return;
      if (event.defaultPrevented || isEditableTarget(event.target)) return;
      const currentIndex = NAVIGATION_ITEMS.findIndex(
        (item) => item.href === pathnameRef.current,
      );
      if (currentIndex === -1) return;

      let targetIndex: number | null = null;
      if (
        event.key === "ArrowDown" ||
        event.key === "PageDown" ||
        (event.key === " " && !event.shiftKey)
      ) {
        targetIndex = currentIndex + 1;
      } else if (
        event.key === "ArrowUp" ||
        event.key === "PageUp" ||
        (event.key === " " && event.shiftKey)
      ) {
        targetIndex = currentIndex - 1;
      } else if (event.key === "Home") {
        targetIndex = 0;
      } else if (event.key === "End") {
        targetIndex = NAVIGATION_ITEMS.length - 1;
      }

      if (targetIndex === null || !NAVIGATION_ITEMS[targetIndex]) return;
      event.preventDefault();
      navigateToPage(NAVIGATION_ITEMS[targetIndex].href);
    };

    window.addEventListener("wheel", handleWheel, {
      passive: false,
      capture: true,
    });
    window.addEventListener("touchstart", handleTouchStart, {
      passive: true,
      capture: true,
    });
    window.addEventListener("touchmove", handleTouchMove, {
      passive: false,
      capture: true,
    });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel, true);
      window.removeEventListener("touchstart", handleTouchStart, true);
      window.removeEventListener("touchmove", handleTouchMove, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [keyframingEnabled, navigateBy, navigateToPage, positionInfoEnabled]);

  const value = useMemo(
    () => ({ navigateBy, navigateToPage, primePage }),
    [navigateBy, navigateToPage, primePage],
  );

  return (
    <PageNavigationContext.Provider value={value}>
      {children}
    </PageNavigationContext.Provider>
  );
}

export function usePageNavigation() {
  const context = useContext(PageNavigationContext);
  if (!context) {
    throw new Error(
      "usePageNavigation must be used within PageNavigationController",
    );
  }
  return context;
}
