"use client";

import { Primitive } from "@radix-ui/react-primitive";
import * as React from "react";

// Create a primitive button with proper typing
const CustomButton = React.forwardRef<
  React.ElementRef<typeof Primitive.button>,
  React.ComponentPropsWithoutRef<typeof Primitive.button>
>(({ children, ...props }, forwardedRef) => (
  <Primitive.button
    {...props}
    ref={forwardedRef}
    className="rounded-[5px] bg-[var(--main-accent-color)] px-4 py-2 text-[0.9em] text-white hover:bg-[var(--main-accent-color-dark)] focus:outline-none"
  >
    {children}
  </Primitive.button>
));

CustomButton.displayName = "CustomButton";

export default CustomButton;
