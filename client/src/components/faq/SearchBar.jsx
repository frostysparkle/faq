import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { readRecentFaqSearches, rememberFaqSearch } from "@/lib/recentSearches.js";
import { cn } from "@/lib/utils.js";

export default function SearchBar({ value, onChange, onSubmit, className }) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "/" && document.activeElement !== inputRef.current) {
        event.preventDefault();
        inputRef.current?.focus();
      }

      if (event.key === "Escape" && document.activeElement === inputRef.current) {
        onChange("");
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onChange]);

  const showRecent = focused && !value && recentSearches.length > 0;
  const containerState = useMemo(() => (focused ? "focused" : "idle"), [focused]);

  return (
    <div className={cn("relative", className)}>
      <motion.form
        animate={containerState}
        variants={{
          idle: { scale: 1 },
          focused: { scale: 1.01 }
        }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit?.(value);
          rememberFaqSearch(value);
        }}
        className="premium-card flex h-14 items-center gap-3 px-4"
      >
        <Search className="h-5 w-5 text-textMuted" aria-hidden="true" />
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => {
            setFocused(true);
            setRecentSearches(readRecentFaqSearches());
          }}
          onBlur={() => setFocused(false)}
          aria-label="Search FAQs"
          placeholder="Search policy, deadlines, eligibility, process..."
          className="min-w-0 flex-1 bg-transparent text-base text-textPrimary outline-none placeholder:text-textMuted"
        />
        <kbd className="hidden rounded-md border border-white/10 px-2 py-1 text-xs text-textMuted sm:block">/</kbd>
        {value && (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Clear search" onClick={() => onChange("")}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </motion.form>

      <AnimatePresence>
        {showRecent && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="premium-card absolute left-0 right-0 top-16 z-30 p-2"
          >
            {recentSearches.map((search) => (
              <button
                key={search}
                type="button"
                className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-textMuted hover:bg-white/5 hover:text-textPrimary"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(search);
                  onSubmit?.(search);
                }}
              >
                {search}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
