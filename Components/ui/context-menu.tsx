"use client";

import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

export function ContextMenuContent({
  className = "",
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        data-page-navigation-ignore
        className={`z-[100] min-w-40 overflow-hidden rounded-md border border-neutral-200 bg-white p-1 text-neutral-900 shadow-xl outline-none data-[state=open]:animate-in ${className}`}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

export function ContextMenuItem({
  className = "",
  inset,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & {
  inset?: boolean;
}) {
  return (
    <ContextMenuPrimitive.Item
      className={`relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none transition-colors focus:bg-neutral-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-45 ${inset ? "pl-8" : ""} ${className}`}
      {...props}
    />
  );
}
