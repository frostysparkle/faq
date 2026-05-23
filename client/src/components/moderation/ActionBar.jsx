import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button.jsx";
import { cn } from "@/lib/utils.js";

const colorClass = {
  green: "bg-success text-deep hover:bg-success/90",
  red: "bg-danger text-white hover:bg-danger/90",
  amber: "bg-warning text-deep hover:bg-warning/90",
  blue: "bg-accentBlue text-white hover:bg-accentBlue/90",
  neutral: "border-white/10 bg-white/5 text-textPrimary hover:bg-white/10"
};

export default function ActionBar({ actions }) {
  const [activeInput, setActiveInput] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const activeAction = actions.find((action) => action.label === activeInput);

  const runAction = (action) => {
    if (action.requiresInput) {
      setActiveInput(action.label);
      setInputValue("");
      return;
    }

    action.onClick();
  };

  const submitInput = () => {
    if (!activeAction || !inputValue.trim()) return;
    activeAction.onClick(inputValue.trim());
    setActiveInput(null);
    setInputValue("");
  };

  return (
    <motion.div layout className="border-t border-white/5 bg-deep/95 p-3 backdrop-blur">
      {activeAction && (
        <div className="mb-3 flex gap-2">
          <input
            autoFocus
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitInput();
              if (event.key === "Escape") setActiveInput(null);
            }}
            placeholder={activeAction.inputPlaceholder}
            className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-textPrimary outline-none focus:ring-2 focus:ring-accentBlue"
          />
          <Button type="button" onClick={submitInput}>Submit</Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            type="button"
            data-action={action.label}
            variant={action.color === "neutral" ? "outline" : "default"}
            onClick={() => runAction(action)}
            disabled={action.disabled}
            className={cn("h-9", colorClass[action.color] ?? colorClass.neutral)}
            title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
          >
            {action.label}
            {action.shortcut && <kbd className="rounded bg-black/20 px-1.5 py-0.5 text-[10px]">{action.shortcut}</kbd>}
          </Button>
        ))}
      </div>
    </motion.div>
  );
}
