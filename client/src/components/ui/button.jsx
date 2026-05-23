import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils.js";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold outline-none transition-[background,border,box-shadow,color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-white shadow-md hover:bg-accent/90 active:translate-y-px",
        default: "bg-accent text-white shadow-md hover:bg-accent/90 active:translate-y-px",
        secondary: "border border-white/10 bg-white/8 text-textPrimary hover:bg-white/12",
        ghost: "text-textMuted hover:bg-white/8 hover:text-textPrimary",
        danger: "bg-danger text-white hover:bg-danger/90 active:translate-y-px",
        destructive: "bg-danger text-white hover:bg-danger/90 active:translate-y-px",
        outline: "border border-white/10 bg-transparent text-textPrimary hover:border-accent/40 hover:bg-accent/10"
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        default: "h-10 px-4 text-sm",
        lg: "h-12 px-5 text-base",
        icon: "h-10 w-10 px-0"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

export const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          aria-disabled={disabled || loading}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} disabled={disabled || loading} {...props}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export { buttonVariants };
