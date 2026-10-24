import type { Config } from "tailwindcss"
import plugin from "tailwindcss/plugin"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        brand: ["var(--font-permanent-marker)", "cursive"],
      },
      fontSize: {
        caption: ["0.75rem", { lineHeight: "1rem" }], // 12px
        label: ["0.8125rem", { lineHeight: "1.125rem", letterSpacing: "0.06em" }], // 13px caixa alta
        body: ["0.9375rem", { lineHeight: "1.4rem" }], // 15px
        title: ["1.125rem", { lineHeight: "1.5rem" }], // 18px
        display: ["1.625rem", { lineHeight: "2rem", letterSpacing: "-0.02em" }], // 26px
      },
      spacing: {
        tap: "2.75rem", // 44px: alvo de toque mínimo
        page: "1.25rem", // 20px: margem lateral da página (px-page)
      },
      boxShadow: {
        glow: "var(--shadow-glow)",
        selected: "var(--shadow-selected)",
      },
      transitionTimingFunction: { out: "var(--ease-out)", motion: "var(--ease-motion)" },
      colors: {
        surface2: "hsl(var(--surface-2))",
        disabled: "hsl(var(--disabled))",
        warning: "hsl(var(--warning))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          solid: "hsl(var(--destructive-solid))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          soft: "hsl(var(--accent-soft))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Microinterações (flag MOTION, Prompt 21): só transform e opacidade (o ✓ usa stroke-dashoffset,
        // exceção aprovada: SVG de 20px, só repintura). Sempre com `fx:motion-safe:`.
        "slots-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
        },
        pop: {
          "50%": { transform: "scale(1.07)" },
        },
        "card-in": {
          from: { opacity: "0", transform: "translateY(12px)" },
        },
        "check-draw": {
          from: { strokeDashoffset: "1" },
          to: { strokeDashoffset: "0" },
        },
        "ring-pulse": {
          from: { opacity: "0.6", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(1.8)" },
        },
        "status-in": {
          from: { opacity: "0", transform: "translateX(-6px)" },
        },
        bump: {
          "50%": { transform: "scale(1.25)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slots-in": "slots-in 220ms var(--ease-motion) both",
        pop: "pop 200ms var(--ease-motion)",
        "card-in": "card-in 320ms var(--ease-motion) both",
        "check-draw": "check-draw 300ms var(--ease-motion) 80ms both",
        "ring-pulse": "ring-pulse 320ms var(--ease-motion) 80ms both",
        "status-in": "status-in 220ms var(--ease-motion) both",
        bump: "bump 240ms var(--ease-motion)",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // `fx:` = só com a flag MOTION (atributo no <html>, ver app/_providers/motion.tsx). Vale também
    // para portais (Sheet, Dialog, toast). Combinar com `motion-safe:` em toda animação.
    plugin(({ addVariant }) => addVariant("fx", 'html[data-motion="on"] &')),
  ],
} satisfies Config

export default config