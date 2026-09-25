import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
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
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        /* ── Premium Emerald + Gold Palette ── */
        electric: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
        cyan: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        gold: {
          50: "#fefce8",
          100: "#fef9c3",
          200: "#fef08a",
          300: "#fde047",
          400: "#facc15",
          500: "#eab308",
          600: "#ca8a04",
          700: "#a16207",
          800: "#854d0e",
          900: "#713f12",
          950: "#422006",
        },
        neon: {
          pink: "#f472b6",
          purple: "#10b981",
          blue: "#3b82f6",
          teal: "#14b8a6",
          green: "#22c55e",
          yellow: "#eab308",
          orange: "#f97316",
          red: "#ef4444",
        },
        /* ── Semantic Data Viz Tokens ── */
        success: {
          light: "#4ade80",
          DEFAULT: "#22c55e",
          dark: "#16a34a",
          bg: "rgba(34, 197, 94, 0.12)",
        },
        warning: {
          light: "#fbbf24",
          DEFAULT: "#f59e0b",
          dark: "#d97706",
          bg: "rgba(245, 158, 11, 0.12)",
        },
        info: {
          light: "#60a5fa",
          DEFAULT: "#3b82f6",
          dark: "#2563eb",
          bg: "rgba(59, 130, 246, 0.12)",
        },
        danger: {
          light: "#f87171",
          DEFAULT: "#ef4444",
          dark: "#dc2626",
          bg: "rgba(239, 68, 68, 0.12)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      /* ── Custom Blur for Glassmorphism ── */
      backdropBlur: {
        xs: "2px",
        "2xl": "40px",
        "3xl": "64px",
      },
      /* ── Premium Animations ── */
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "fade-in-up": "fadeInUp 0.5s ease-out forwards",
        "fade-in-down": "fadeInDown 0.5s ease-out forwards",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-down": "slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scale-in": "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-glow": "pulseGlow 2.5s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "gradient-shift": "gradientShift 8s ease infinite",
        "glow-purple": "glowPurple 2s ease-in-out infinite alternate",
        "glow-cyan": "glowCyan 2s ease-in-out infinite alternate",
        "border-glow": "borderGlow 3s ease-in-out infinite",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        glowPurple: {
          "0%": { boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)" },
          "100%": { boxShadow: "0 0 40px rgba(16, 185, 129, 0.8)" },
        },
        glowCyan: {
          "0%": { boxShadow: "0 0 20px rgba(14, 165, 233, 0.4)" },
          "100%": { boxShadow: "0 0 40px rgba(14, 165, 233, 0.8)" },
        },
        borderGlow: {
          "0%, 100%": { borderColor: "rgba(16, 185, 129, 0.5)" },
          "50%": { borderColor: "rgba(14, 165, 233, 0.5)" },
        },
      },
      /* ── Background Mesh Gradients ── */
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gradient-mesh":
          "radial-gradient(at 0% 0%, rgba(16, 185, 129, 0.1) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(14, 165, 233, 0.08) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(250, 204, 21, 0.05) 0px, transparent 50%)",
        "gradient-primary":
          "linear-gradient(135deg, #059669 0%, #10b981 100%)",
        "gradient-accent":
          "linear-gradient(135deg, #059669 0%, #fbbf24 100%)",
        "gradient-electric":
          "linear-gradient(135deg, #059669 0%, #10b981 50%, #0ea5e9 100%)",
        "gradient-dark":
          "linear-gradient(180deg, #0c0e12 0%, #141820 50%, #0c0e12 100%)",
        "shimmer-gradient":
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
      },
      /* ── Box Shadows for Glow Effects ── */
      boxShadow: {
        "glow-purple": "0 0 25px rgba(16, 185, 129, 0.35)",
        "glow-purple-lg": "0 0 40px rgba(16, 185, 129, 0.5)",
        "glow-cyan": "0 0 25px rgba(14, 165, 233, 0.35)",
        "glow-cyan-lg": "0 0 40px rgba(14, 165, 233, 0.5)",
        "glow-gold": "0 0 25px rgba(250, 204, 21, 0.35)",
        "glow-sm": "0 0 15px rgba(16, 185, 129, 0.25)",
        "inner-glow": "inset 0 0 30px rgba(16, 185, 129, 0.05)",
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
        "card-hover": "0 20px 40px -12px rgba(16, 185, 129, 0.25)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      /* ── Transition & Timing ── */
      transitionDuration: {
        "400": "400ms",
        "600": "600ms",
        "800": "800ms",
        "1200": "1200ms",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
        bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
      /* ── Z-Index Scale ── */
      zIndex: {
        "60": "60",
        "70": "70",
        "80": "80",
        "90": "90",
        "100": "100",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
