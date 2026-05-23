import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils.js";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = ({ className, sideOffset = 6, ...props }) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      sideOffset={sideOffset}
      className={cn(
        "z-50 rounded-md border border-white/10 bg-deep px-2.5 py-1.5 text-xs text-textPrimary shadow-xl animate-in fade-in-0 zoom-in-95",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
);
