export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  safelist: [
    "border-l-danger",
    "border-l-warning",
    "border-l-success",
    "bg-danger/5",
    "bg-warning/5",
    "bg-success/5",
    "text-danger",
    "text-warning",
    "text-success",
    "bg-danger/10",
    "bg-warning/10",
    "bg-success/10",
    "border-danger/20",
    "border-warning/20",
    "border-success/20"
  ],
  theme: {
    extend: {
      colors: {
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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        }
      },
      fontFamily: {
        display: ["DM Serif Display", "serif"],
        sans: ["DM Sans", "sans-serif"]
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
        "5xl": ["3rem", { lineHeight: "1" }]
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
        xl: "0.75rem",
        "2xl": "1rem"
      },
      boxShadow: {
        sm: "0 1px 2px rgb(0 0 0 / 0.28)",
        md: "0 12px 36px rgb(0 0 0 / 0.24)",
        xl: "0 24px 70px rgb(0 0 0 / 0.32)",
        glow: "0 0 0 1px rgba(79,142,247,0.2), 0 18px 42px rgba(79,142,247,0.12)",
        workspace: "0 18px 60px rgb(15 23 42 / 0.18)"
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-700px 0" },
          "100%": { backgroundPosition: "700px 0" }
        },
        "pulse-once": {
          "0%": { boxShadow: "0 0 0 0 rgba(79,142,247,0.35)" },
          "100%": { boxShadow: "0 0 0 12px rgba(79,142,247,0)" }
        },
        "toast-enter": {
          from: { opacity: "0", transform: "translateX(24px)" },
          to: { opacity: "1", transform: "translateX(0)" }
        },
        "toast-exit": {
          from: { opacity: "1", transform: "translateX(0)" },
          to: { opacity: "0", transform: "translateX(-24px)" }
        }
      },
      animation: {
        "fade-in": "fade-in 180ms ease-out",
        "fade-in-up": "fade-in-up 220ms ease-out",
        shimmer: "shimmer 1.5s linear infinite",
        "pulse-once": "pulse-once 900ms ease-out 1",
        "toast-enter": "toast-enter 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        "toast-exit": "toast-exit 180ms ease-in"
      }
    }
  },
  plugins: []
};
