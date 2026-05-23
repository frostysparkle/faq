import { useEffect } from "react";

const isTypingTarget = (element) => {
  const tagName = element?.tagName?.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || element?.isContentEditable;
};

export const useKeyboardShortcuts = (shortcuts, options = {}) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!options.enableInInputs && isTypingTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      const shortcut = shortcuts.find((item) => item.key.toLowerCase() === key && !item.disabled);

      if (!shortcut) return;

      event.preventDefault();
      shortcut.onKey(event);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [options.enableInInputs, shortcuts]);
};
