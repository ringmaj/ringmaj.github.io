"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { FiCheck, FiCopy } from "react-icons/fi";

export interface SkateMotionCurveSnapshot {
  route: "/skate-analysis";
  trick: {
    source: "generated-preset" | "custom";
    presetId: string;
    label: string;
    detectedName: string;
    rotationCombination: string;
  };
  timing: {
    playbackDurationSeconds: number;
    restartDelaySeconds: number;
    preparationDurationSeconds: number;
    leftFootPreparationDelaySeconds: number;
  };
  curveChannels: Record<
    string,
    {
      label: string;
      minimum: number;
      maximum: number;
      points: Array<{ time: number; value: number }>;
    }
  >;
  rotationMaximumDegrees: Record<string, number>;
  footCatchSeconds: {
    left: number;
    right: number;
  };
}

declare global {
  interface Window {
    __SKATE_MOTION_CURVE_SNAPSHOT__?: SkateMotionCurveSnapshot;
    __LAST_SKATE_TRICK_DEBUG_EXPORT__?: unknown;
  }
}

let currentSnapshot: SkateMotionCurveSnapshot | null = null;

export function publishSkateMotionCurveSnapshot(
  snapshot: SkateMotionCurveSnapshot,
) {
  currentSnapshot = snapshot;
  if (typeof window !== "undefined") {
    window.__SKATE_MOTION_CURVE_SNAPSHOT__ = snapshot;
  }
}

export function clearSkateMotionCurveSnapshot(
  snapshot: SkateMotionCurveSnapshot,
) {
  if (currentSnapshot === snapshot) currentSnapshot = null;
  if (
    typeof window !== "undefined" &&
    window.__SKATE_MOTION_CURVE_SNAPSHOT__ === snapshot
  ) {
    delete window.__SKATE_MOTION_CURVE_SNAPSHOT__;
  }
}

async function copyText(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  let copied = document.execCommand("copy");
  textarea.remove();

  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {}

  return copied;
}

export function SkateMotionCurveExportButton() {
  const pathname = usePathname();
  const [status, setStatus] = useState<"idle" | "copied" | "unavailable">(
    "idle",
  );

  if (pathname !== "/skate-analysis") return null;

  const copyCurrentTrick = async () => {
    const snapshot =
      currentSnapshot ?? window.__SKATE_MOTION_CURVE_SNAPSHOT__ ?? null;
    if (!snapshot) {
      setStatus("unavailable");
      window.setTimeout(() => setStatus("idle"), 1600);
      return;
    }

    const payload = {
      schema: "portfolio-skate-trick/v1",
      exportedAt: new Date().toISOString(),
      ...snapshot,
    };
    window.__LAST_SKATE_TRICK_DEBUG_EXPORT__ = payload;
    const copied = await copyText(JSON.stringify(payload, null, 2));
    setStatus(copied ? "copied" : "unavailable");
    window.setTimeout(() => setStatus("idle"), 1600);
  };

  const copied = status === "copied";

  return (
    <button
      type="button"
      data-page-navigation-ignore
      title="Copy every motion curve value for the current trick"
      aria-label="Copy current skate trick motion curves"
      className="flex h-8 items-center gap-2 rounded-md border border-neutral-200 bg-white px-2.5 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50"
      onClick={copyCurrentTrick}
    >
      {copied ? (
        <FiCheck aria-hidden="true" className="text-sm text-emerald-600" />
      ) : (
        <FiCopy aria-hidden="true" className="text-sm text-neutral-500" />
      )}
      <span className="hidden lg:inline">
        {copied
          ? "Copied trick"
          : status === "unavailable"
            ? "Not ready"
            : "Copy trick"}
      </span>
    </button>
  );
}
