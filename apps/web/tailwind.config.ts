import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        accent: "var(--color-accent)",
        surface: "var(--color-surface)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
        foreground: "var(--color-foreground)",
        "muted-foreground": "var(--color-muted-foreground)",
        background: "var(--color-background)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(15, 118, 110, 0.28), transparent), radial-gradient(ellipse 60% 50% at 80% 10%, rgba(245, 158, 11, 0.18), transparent), linear-gradient(160deg, #0f172a 0%, #134e4a 45%, #0f766e 100%)",
        "mesh-light":
          "radial-gradient(ellipse at top left, rgba(15, 118, 110, 0.12), transparent 50%), radial-gradient(ellipse at bottom right, rgba(245, 158, 11, 0.1), transparent 45%), linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s ease-out both",
        "fade-in": "fade-in 0.6s ease-out both",
        float: "float 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
