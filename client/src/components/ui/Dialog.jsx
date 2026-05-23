import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "./button.jsx";
import { cn } from "@/lib/utils.js";
import { scaleIn } from "@/lib/motion.js";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = ({ className, children, ...props }) => (
  <DialogPrimitive.Portal>
    <AnimatePresence>
      <DialogPrimitive.Overlay asChild>
        <motion.div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      </DialogPrimitive.Overlay>
      <DialogPrimitive.Content asChild {...props}>
        <motion.div
          {...scaleIn}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-surface p-5 text-textPrimary shadow-xl outline-none",
            className
          )}
        >
          {children}
          <DialogPrimitive.Close asChild>
            <Button type="button" variant="ghost" size="icon" className="absolute right-3 top-3 h-8 w-8" aria-label="Close dialog">
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DialogPrimitive.Close>
        </motion.div>
      </DialogPrimitive.Content>
    </AnimatePresence>
  </DialogPrimitive.Portal>
);

export const DialogHeader = ({ className, ...props }) => <div className={cn("pr-10", className)} {...props} />;
export const DialogTitle = ({ className, ...props }) => (
  <DialogPrimitive.Title className={cn("font-display text-2xl text-textPrimary", className)} {...props} />
);
export const DialogDescription = ({ className, ...props }) => (
  <DialogPrimitive.Description className={cn("mt-2 text-sm leading-6 text-textMuted", className)} {...props} />
);
export const DialogFooter = ({ className, ...props }) => (
  <div className={cn("mt-5 flex justify-end gap-2", className)} {...props} />
);
