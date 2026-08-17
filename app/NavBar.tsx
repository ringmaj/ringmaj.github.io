"use client";

import Link from "next/link";
import React from "react";
import { FaLinkedin, FaGithub } from "react-icons/fa";
import classnames from "classnames";
import { NAVIGATION_ITEMS } from "@/Components/navigationRoutes";
import { usePageNavigation } from "@/Components/PageNavigationController";
import PerformanceStats from "@/Components/PerformanceStats";
import { PositionInfoToggle } from "@/Components/PositionInfo";
import { KeyframingToggle } from "@/Components/Keyframing";
import { SkateMotionCurveExportButton } from "@/Components/SkateMotionCurveExport";
import { DEBUG_MODE } from "@/Components/debugMode";
import { LightingDebugToggle } from "@/Components/LightingDebug";

const links = [
  { label: "Home", href: "/" },
  { label: "About Me", href: "/about-me" },
  { label: "Experience", href: "/overview" },
  { label: "Resume", href: "/resume" },
];

const NavBar = () => {
  const { navigateToPage, primePage } = usePageNavigation();

  return (
    <nav className="relative flex items-center border-b border-b-[#00296a28] px-5 py-2 text-[0.8em] font-SbEina max-sm:px-2 max-sm:py-1.5 max-sm:text-[0.68em]">
      {DEBUG_MODE && (
        <div className="absolute left-0 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1 max-sm:left-1">
          <div className="max-sm:hidden">
            <PerformanceStats />
          </div>
          <PositionInfoToggle />
          <div className="contents max-sm:hidden">
            <KeyframingToggle />
            <LightingDebugToggle />
            <SkateMotionCurveExportButton />
          </div>
        </div>
      )}
      <div
        id="nav-items-container"
        className={classnames(
          "mx-auto flex w-full max-w-[1296px] items-center",
          DEBUG_MODE && "max-sm:pl-12 sm:pl-[15rem] md:pl-[39rem] xl:pl-[43rem]",
        )}
      >
        <ul className="flex h-3/4 items-center max-sm:min-w-0">
          {links.map((link) => (
            <li
              key={link.href}
              className={classnames({
                // "text-gray-600": currentPath === link.href,
                // "text-black": currentPath !== link.href,
                "mx-0 flex h-9 items-center rounded-md px-[0.5em] transition-colors hover:bg-[#b94100] hover:text-[white] max-sm:h-8 max-sm:px-[0.32em]": true,
              })}
            >
              <Link
                href={link.href}
                onClick={(event) => {
                  if (
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey ||
                    !NAVIGATION_ITEMS.some((item) => item.href === link.href)
                  ) {
                    return;
                  }
                  event.preventDefault();
                  navigateToPage(link.href);
                }}
                onPointerEnter={() => primePage(link.href)}
                onFocus={() => primePage(link.href)}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div id="nav-logos-container" className="ml-auto flex shrink-0">
          <Link
            href="https://www.linkedin.com/in/Henry-r-4b1936110/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaLinkedin className="ml-auto text-[2em] max-sm:text-[1.75em]" />
          </Link>
          <div className="mx-2 h-[1.6rem] border-r-2 border-r-black max-sm:mx-1" />

          <Link
            href="https://github.com/ringmaj"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaGithub className="text-[2em] max-sm:text-[1.75em]" />
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
