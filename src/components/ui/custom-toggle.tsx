
import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

const CustomToggle = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-700",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none relative flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-7 data-[state=unchecked]:translate-x-0"
      )}
    >
      <Check
        className="h-3 w-3 text-primary absolute opacity-0 transition-opacity data-[state=checked]:opacity-100"
        data-state={props.checked ? "checked" : "unchecked"}
      />
      <X
        className="h-3 w-3 text-gray-500 absolute opacity-0 transition-opacity data-[state=unchecked]:opacity-100"
        data-state={props.checked ? "checked" : "unchecked"}
      />
    </SwitchPrimitives.Thumb>
    <span className="sr-only">{props.checked ? "On" : "Off"}</span>
  </SwitchPrimitives.Root>
));

CustomToggle.displayName = SwitchPrimitives.Root.displayName;

export { CustomToggle };
