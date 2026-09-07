import type { Config } from "tailwindcss";

/**
 * alarent — Dispatch.
 *
 * Ink, line and paper are literal: they are the system, not a preference, and a tenant cannot
 * move them. Only `signal` reads a CSS variable, because the theme editor is allowed exactly
 * one colour. Radius is 0 with no scale to escape into.
 */
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
        ink: {
          DEFAULT: "#0C0D0F",
          raised: "#101216",
          sunk: "#0A0B0D",
          hover: "#15181C",
        },
        line: {
          DEFAULT: "#23251F",
          soft: "#1A1C18",
          strong: "#33362D",
          raised: "#2C2F27",
        },
        paper: {
          DEFAULT: "#EDEEEA",
          soft: "#C6C9BE",
          dim: "#9B9F91",
          mute: "#7C8072",
          faint: "#565A4E",
          ghost: "#3E4136",
        },
        signal: {
          DEFAULT: "var(--signal, #D7FF3E)",
          ink: "var(--signal-ink, #0C0D0F)",
          press: "var(--signal-press, #EDEEEA)",
          line: "var(--signal-line, #4A5A16)",
          tint: "var(--signal-tint, rgba(215,255,62,0.12))",
        },
        warn: {
          DEFAULT: "#FFB020",
          line: "#5C4415",
          tint: "rgba(255,176,32,0.10)",
        },
        danger: {
          DEFAULT: "#FF6A52",
          line: "#63241B",
          border: "#6B2018",
          tint: "rgba(255,90,60,0.10)",
        },

        // Legacy semantic names, aliased so an un-migrated file lands in the right palette.
        background: "var(--ink)",
        surface: "var(--ink-raised)",
        muted: "var(--ink-hover)",
        border: "var(--line)",
        foreground: "var(--paper)",
        "muted-foreground": "var(--paper-mute)",
        primary: "var(--signal)",
        "primary-hover": "var(--signal-press)",
        accent: "var(--warn)",
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)", "IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "IBM Plex Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        // The scale from the spec. Line height and tracking travel with the size so a heading
        // cannot be assembled wrongly out of loose utilities.
        display: ["clamp(48px, 9vw, 104px)", { lineHeight: "0.88", letterSpacing: "-0.05em" }],
        h1: ["clamp(30px, 4.6vw, 52px)", { lineHeight: "0.94", letterSpacing: "-0.045em" }],
        h2: ["26px", { lineHeight: "1.08", letterSpacing: "-0.025em" }],
        h3: ["19px", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        body: ["15px", { lineHeight: "1.6" }],
        small: ["13px", { lineHeight: "1.55" }],
        label: ["11px", { lineHeight: "1.2", letterSpacing: "0.14em" }],
        micro: ["9.5px", { lineHeight: "1.2", letterSpacing: "0.14em" }],
      },
      borderRadius: {
        none: "0",
        DEFAULT: "0",
        sm: "0",
        md: "0",
        lg: "0",
        xl: "0",
        "2xl": "0",
        "3xl": "0",
        full: "0",
      },
      boxShadow: {
        // No decorative shadows. The one exception is a surface genuinely floating over the
        // page — a dialog, a menu — where depth tells you it is dismissible.
        none: "none",
        panel: "0 24px 64px rgba(0,0,0,0.55)",
        lift: "0 40px 120px rgba(0,0,0,0.6)",
      },
      maxWidth: {
        measure: "1240px",
      },
      spacing: {
        gutter: "28px",
        row: "42px",
        "row-console": "36px",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
        io: "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      transitionDuration: {
        instant: "120ms",
        control: "200ms",
        surface: "420ms",
        editorial: "900ms",
      },
      backgroundImage: {
        // The blueprint fill behind an empty image slot, and the hero's field grid.
        blueprint:
          "linear-gradient(rgba(215,255,62,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(215,255,62,0.05) 1px, transparent 1px)",
        field:
          "linear-gradient(rgba(215,255,62,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(215,255,62,0.055) 1px, transparent 1px)",
        scan: "repeating-linear-gradient(180deg, rgba(255,255,255,0.018) 0 2px, transparent 2px 5px)",
      },
      backgroundSize: {
        blueprint: "26px 26px",
        field: "64px 64px",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "al-blink": {
          "0%, 55%": { opacity: "1" },
          "56%, 100%": { opacity: "0.18" },
        },
        "al-sweep": {
          from: { transform: "translateX(-120%)" },
          to: { transform: "translateX(520%)" },
        },
        "al-spin": {
          to: { transform: "rotate(360deg)" },
        },
        "bar-in": {
          from: { transform: "scaleX(0)", opacity: "0" },
          to: { transform: "scaleX(1)", opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 420ms cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 200ms ease-out both",
        blink: "al-blink 1.8s steps(1) infinite",
        "blink-fast": "al-blink 1.4s steps(1) infinite",
        sweep: "al-sweep 6s linear infinite",
        spin: "al-spin 700ms linear infinite",
        "bar-in": "bar-in 520ms cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
