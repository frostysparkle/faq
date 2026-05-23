import { Toaster as SonnerToaster } from "sonner";

export const Toaster = () => (
  <SonnerToaster
    position="bottom-right"
    toastOptions={{
      classNames: {
        // MICROINTERACTION: toast entry slides from right and exits left through Sonner's lifecycle classes.
        toast:
          "border border-white/10 bg-surface text-textPrimary shadow-xl data-[mounted=true]:animate-toast-enter data-[removed=true]:animate-toast-exit",
        title: "text-textPrimary",
        description: "text-textMuted",
        success: "border-success/25",
        error: "border-danger/25",
        warning: "border-warning/25",
        info: "border-accent/25"
      }
    }}
  />
);
