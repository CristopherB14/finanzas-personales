import * as React from "react";
import { cn } from "@/lib/utils";
import { focusRing } from "@/lib/a11y";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        focusRing,
        "flex h-11 w-full rounded-xl border border-input bg-card px-4 py-2 text-base text-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
