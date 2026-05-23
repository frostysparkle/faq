import designSystem from "./designSystem.js";

export const designTokens = Object.freeze({
  ...designSystem,
  typography: {
    display: "'DM Serif Display', serif",
    body: "'DM Sans', sans-serif"
  },
  motion: {
    spring: {
      type: "spring",
      stiffness: 260,
      damping: 28
    }
  }
});
