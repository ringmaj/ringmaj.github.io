export const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG === "true";

declare global {
  interface Window {
    __PORTFOLIO_DEBUG_MODE__?: boolean;
    __LAST_MATERIAL_DEBUG_EXPORT__?: unknown;
  }
}

if (typeof window !== "undefined") {
  window.__PORTFOLIO_DEBUG_MODE__ ??= DEBUG_MODE;
}

export function isPortfolioDebugMode() {
  return typeof window === "undefined"
    ? DEBUG_MODE
    : (window.__PORTFOLIO_DEBUG_MODE__ ?? DEBUG_MODE);
}
