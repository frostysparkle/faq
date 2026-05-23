import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { FilePlus2, HelpCircle, LayoutDashboard, Search, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils.js";
import { springTransition } from "@/lib/motion.js";

const groups = [
  {
    heading: "Navigate",
    items: [
      { label: "Home", href: "/", icon: LayoutDashboard },
      { label: "FAQ Explorer", href: "/faqs", icon: HelpCircle },
      { label: "Community", href: "/community", icon: UsersRound },
      { label: "Guided Assistant", href: "/assistant", icon: Sparkles },
      { label: "Intelligence Overview", href: "/admin/intelligence", icon: LayoutDashboard },
      { label: "Moderation Console", href: "/moderator/console", icon: ShieldCheck }
    ]
  },
  {
    heading: "Quick Actions",
    items: [
      { label: "Create FAQ", href: "/admin/faqs/new", icon: FilePlus2 },
      { label: "Open Review Queue", href: "/moderator/queue", icon: ShieldCheck },
      { label: "Review FAQ Quality", href: "/admin/faq-quality", icon: HelpCircle }
    ]
  }
];

export default function CommandPalette({ open, onOpenChange }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const visibleGroups = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
      })),
    [query]
  );

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange?.(!open);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  const run = (href) => {
    navigate(href);
    setQuery("");
    onOpenChange?.(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {/* MICROINTERACTION: CommandPalette backdrop blur fades in. */}
          <button type="button" aria-label="Close command palette" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange?.(false)} />
          <motion.div
            // MICROINTERACTION: palette drops from top with spring.
            initial={{ opacity: 0, y: -18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={springTransition}
            className="absolute left-1/2 top-20 w-[min(92vw,720px)] -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 bg-surface shadow-xl"
          >
            <Command shouldFilter={false} className="bg-transparent text-textPrimary">
              <div className="flex items-center gap-3 border-b border-white/5 px-4">
                <Search className="h-4 w-4 text-textMuted" aria-hidden="true" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  autoFocus
                  placeholder="Search FAQs, navigate pages, run actions..."
                  className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-textMuted"
                />
                <kbd className="rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-textMuted">Esc</kbd>
              </div>
              <Command.List className="max-h-[420px] overflow-auto p-2">
                <Command.Empty className="p-6 text-center text-sm text-textMuted">No command found.</Command.Empty>
                {visibleGroups.map((group) =>
                  group.items.length > 0 ? (
                    <Command.Group key={group.heading} heading={group.heading} className="py-2 text-xs uppercase tracking-[0.16em] text-textMuted">
                      {group.items.map((item) => {
                        const Icon = item.icon;

                        return (
                          <Command.Item
                            key={item.href}
                            value={item.label}
                            onSelect={() => run(item.href)}
                            className={cn(
                              "mt-1 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm normal-case tracking-normal text-textPrimary outline-none",
                              "data-[selected=true]:bg-accent/10 data-[selected=true]:text-accent"
                            )}
                          >
                            <Icon className="h-4 w-4" aria-hidden="true" />
                            {item.label}
                          </Command.Item>
                        );
                      })}
                    </Command.Group>
                  ) : null
                )}
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
