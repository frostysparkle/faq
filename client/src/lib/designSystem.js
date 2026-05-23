export const colors = Object.freeze({
  deep: "#0f1117",
  "neutral-900": "#0f1117",
  surface: "#1a1d27",
  "surface-soft": "#202432",
  accent: "#4f8ef7",
  accentBlue: "#4f8ef7",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  textPrimary: "#f0f2f8",
  textMuted: "#6b7280",
  borderSubtle: "rgba(255,255,255,0.08)",
  white: "#ffffff"
});

export const fontFamilies = Object.freeze({
  display: ["DM Serif Display", "serif"],
  sans: ["DM Sans", "sans-serif"]
});

export const fontSizes = Object.freeze({
  xs: ["0.75rem", { lineHeight: "1rem" }],
  sm: ["0.875rem", { lineHeight: "1.25rem" }],
  base: ["1rem", { lineHeight: "1.5rem" }],
  lg: ["1.125rem", { lineHeight: "1.75rem" }],
  xl: ["1.25rem", { lineHeight: "1.75rem" }],
  "2xl": ["1.5rem", { lineHeight: "2rem" }],
  "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
  "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
  "5xl": ["3rem", { lineHeight: "1" }]
});

export const spacing = Object.freeze({
  0: "0px",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem"
});

export const borderRadius = Object.freeze({
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
  full: "9999px"
});

export const shadows = Object.freeze({
  sm: "0 1px 2px rgb(0 0 0 / 0.28)",
  md: "0 12px 36px rgb(0 0 0 / 0.24)",
  xl: "0 24px 70px rgb(0 0 0 / 0.32)",
  glow: "0 0 0 1px rgba(79,142,247,0.2), 0 18px 42px rgba(79,142,247,0.12)",
  workspace: "0 18px 60px rgb(15 23 42 / 0.18)"
});

export const animations = Object.freeze({
  "fade-in": "fade-in 180ms ease-out",
  "fade-in-up": "fade-in-up 220ms ease-out",
  shimmer: "shimmer 1.5s linear infinite",
  "pulse-once": "pulse-once 900ms ease-out 1",
  "toast-enter": "toast-enter 220ms cubic-bezier(0.22, 1, 0.36, 1)",
  "toast-exit": "toast-exit 180ms ease-in"
});

export const breakpoints = Object.freeze({
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px"
});

export const designSystem = Object.freeze({
  colors,
  fontFamilies,
  fontSizes,
  spacing,
  borderRadius,
  shadows,
  animations,
  breakpoints
});

export default designSystem;
