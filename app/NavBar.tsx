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

const links = [
  { label: "Home", href: "/" },
  { label: "About Me", href: "/about-me" },
  { label: "Experience", href: "/journey" },
  { label: "Resume", href: "/resume" },
];

const NavBar = () => {
  const { navigateToPage, primePage } = usePageNavigation();

  return (
    <nav className="relative flex border-b border-b-[#00296a28] px-5 py-2 items-center text-[0.8em] font-SbEina">
      {DEBUG_MODE && (
        <div className="absolute left-0 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1">
          <PerformanceStats />
          <PositionInfoToggle />
          <KeyframingToggle />
          <SkateMotionCurveExportButton />
        </div>
      )}
      <div
        id="nav-items-container"
        className={classnames(
          "mx-auto flex w-full max-w-[1296px] items-center",
          DEBUG_MODE && "pl-32 sm:pl-[15rem] md:pl-[34rem]",
        )}
      >
        <ul className="flex h-3/4 items-center">
          {links.map((link) => (
            <li
              key={link.href}
              className={classnames({
                // "text-gray-600": currentPath === link.href,
                // "text-black": currentPath !== link.href,
                "flex h-9 hover:text-[white] hover:bg-[#b94100] rounded-md transition-colors px-[0.5em] mx-0 items-center": true,
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

        <div id="nav-logos-container" className="flex ml-auto">
          <Link
            href="https://www.linkedin.com/in/Henry-r-4b1936110/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaLinkedin className="text-[2em] ml-auto  m-r-[100px]" />
          </Link>
          <div className=" h-[1.6rem] mx-2 border-r-2 border-r-black" />

          <Link
            href="https://github.com/ringmaj"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaGithub className="text-[2em]" />
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
