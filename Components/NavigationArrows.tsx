"use client";

import { type ReactNode } from "react";
import { GrDown, GrUp } from "react-icons/gr";
import { usePathname } from "next/navigation";
import classnames from "classnames";
import {
  getNavigationIndex,
  NAVIGATION_ITEMS,
} from "./navigationRoutes";
import { usePageNavigation } from "./PageNavigationController";

interface NavigationArrowsProps {
  children: ReactNode;
  color?: string;
  backgroundUrl?: string;
  backgroundOptions?: string;
}

const NavigationArrows = ({
  children,
  color = "black",
  backgroundUrl,
  backgroundOptions,
}: NavigationArrowsProps) => {
  const pathname = usePathname();
  const { navigateToPage, primePage } = usePageNavigation();
  const currentIndex = getNavigationIndex(pathname);
  const previousPage = NAVIGATION_ITEMS[currentIndex - 1]?.href;
  const nextPage = NAVIGATION_ITEMS[currentIndex + 1]?.href;
  const navigationColor = color === "white" ? "#ffffff" : "#000000";
  const navigationRailLeft =
    "max(1.5rem, calc((100vw - 1200px) / 2 - 4.5rem))";

  const navigate = (page: string | undefined) => {
    if (page) navigateToPage(page);
  };

  return (
    <div
      className={classnames(
        "portfolio-page-shell relative flex h-full w-full justify-center overflow-hidden",
        backgroundOptions,
      )}
      style={
        backgroundUrl ? { backgroundImage: `url(${backgroundUrl})` } : undefined
      }
    >
      <button
        type="button"
        aria-label="Previous page"
        className={classnames(
          "absolute top-[calc(50%-5rem)] z-30 flex cursor-pointer flex-col items-center px-2 py-1 text-3xl max-sm:bottom-3 max-sm:!left-3 max-sm:top-auto max-sm:h-8 max-sm:min-w-12 max-sm:flex-row max-sm:gap-1 max-sm:rounded-md max-sm:border max-sm:px-2 max-sm:py-0 max-sm:text-xs max-sm:shadow-sm max-sm:backdrop-blur-sm",
          {
            invisible: !previousPage,
            "max-sm:border-white/20 max-sm:bg-black/65": color === "white",
            "max-sm:border-black/10 max-sm:bg-white/85": color !== "white",
          },
        )}
        style={{ color: navigationColor, left: navigationRailLeft }}
        onClick={() => navigate(previousPage)}
        onPointerEnter={() => previousPage && primePage(previousPage)}
        onPointerDown={() => previousPage && primePage(previousPage)}
        onFocus={() => previousPage && primePage(previousPage)}
      >
        <GrUp aria-hidden="true" className="max-sm:size-3" />
        <span className="text-[0.42em] font-light leading-none max-sm:text-[0.58rem]">
          Prev
        </span>
      </button>

      <div id="center-container" className="h-full w-full max-w-[1200px]">
        <div id="page-content" className="h-full w-full">
          {children}
        </div>
      </div>

      <nav
        id="dot-navigation"
        aria-label="Portfolio pages"
        className="absolute right-1 top-1/2 z-30 -translate-y-1/2 p-1 max-sm:hidden lg:right-4"
      >
        <ol className="flex flex-col items-center gap-0.5">
          {NAVIGATION_ITEMS.map(({ href, label }, index) => {
            const isCurrent = index === currentIndex;
            return (
              <li key={href} className="flex">
                <button
                  type="button"
                  aria-label={`Go to ${label}`}
                  aria-current={isCurrent ? "page" : undefined}
                  className="group grid size-5 cursor-pointer place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1"
                  style={{ outlineColor: navigationColor }}
                  onClick={() => navigateToPage(href)}
                  onPointerEnter={() => primePage(href)}
                  onPointerDown={() => primePage(href)}
                  onFocus={() => primePage(href)}
                >
                  <span
                    className="size-2 rounded-full border transition-[transform,background-color] duration-200 group-hover:scale-125"
                    style={{
                      borderColor: navigationColor,
                      backgroundColor: isCurrent
                        ? navigationColor
                        : "transparent",
                    }}
                  />
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <button
        type="button"
        aria-label="Next page"
        className={classnames(
          "absolute top-[calc(50%+1.5rem)] z-30 flex cursor-pointer flex-col items-center px-2 py-1 text-3xl max-sm:bottom-3 max-sm:!left-auto max-sm:right-3 max-sm:top-auto max-sm:h-8 max-sm:min-w-12 max-sm:flex-row max-sm:gap-1 max-sm:rounded-md max-sm:border max-sm:px-2 max-sm:py-0 max-sm:text-xs max-sm:shadow-sm max-sm:backdrop-blur-sm",
          {
            invisible: !nextPage,
            "max-sm:border-white/20 max-sm:bg-black/65": color === "white",
            "max-sm:border-black/10 max-sm:bg-white/85": color !== "white",
          },
        )}
        style={{ color: navigationColor, left: navigationRailLeft }}
        onClick={() => navigate(nextPage)}
        onPointerEnter={() => nextPage && primePage(nextPage)}
        onPointerDown={() => nextPage && primePage(nextPage)}
        onFocus={() => nextPage && primePage(nextPage)}
      >
        <span className="text-[0.42em] font-light leading-none max-sm:text-[0.58rem]">
          Next
        </span>
        <GrDown aria-hidden="true" className="max-sm:size-3" />
      </button>
    </div>
  );
};

export default NavigationArrows;
