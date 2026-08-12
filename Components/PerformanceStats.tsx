"use client";

import { useEffect, useRef } from "react";
import Stats from "stats.js";

export default function PerformanceStats() {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mount.current;
    if (!container) return;

    const stats = new Stats();
    stats.showPanel(0);
    stats.dom.title = "Click to switch between FPS, frame time, and memory";
    stats.dom.setAttribute("data-page-navigation-ignore", "");
    Object.assign(stats.dom.style, {
      position: "absolute",
      top: "0",
      left: "0",
      zIndex: "1",
      opacity: "0.9",
      transform: "scale(0.75)",
      transformOrigin: "left top",
      border: "1px solid rgba(255, 255, 255, 0.35)",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.14)",
    });

    container.appendChild(stats.dom);
    let animationFrame = 0;
    const update = () => {
      stats.update();
      animationFrame = window.requestAnimationFrame(update);
    };
    animationFrame = window.requestAnimationFrame(update);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      stats.dom.remove();
    };
  }, []);

  return (
    <div
      ref={mount}
      data-page-navigation-ignore
      aria-label="Performance statistics"
      className="relative h-9 w-[60px] shrink-0 overflow-hidden"
    />
  );
}
