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
    className="bg-[var(--main-accent-color)] hover:bg-[var(--main-accent-color-dark)] text-white text-[0.9em] rounded-[5px] py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-300"
  >
    {children}
  </Primitive.button>
));

CustomButton.displayName = "CustomButton";

export default CustomButton;
