// components/HoverPopover.tsx

"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";

import { ReactNode } from "react";
import JobCard, { JobCardProps } from "./JobCard";

export default function HoverPopover({
  children,
  jobCardProps,
}: {
  children: ReactNode;
  jobCardProps: JobCardProps;
}) {
  const [open, setOpen] = useState(false);

  const handleMouseEnter = () => setOpen(true);
  const handleMouseLeave = () => setOpen(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      {/* Popover Trigger */}
      <Popover.Trigger asChild>
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="flex flex-col items-center justify-center h-full w-full"
        >
          {children}
        </div>

        {/* <button
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="px-4 py-2 text-white rounded outline-none focus:outline-none"
        >
          Hover me
        </button> */}
      </Popover.Trigger>

      {/* Popover Content */}
      <Popover.Portal>
        <Popover.Content
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="bg-white border border-gray-200 p-4 outline-none focus:outline-none rounded-lg"
          side="top"
          sideOffset={5}
        >
          <JobCard {...jobCardProps} />
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
