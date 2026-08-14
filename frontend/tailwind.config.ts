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
        /* ── Premium Electric Palette ── */
        electric: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
        },
        cyan: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
          950: "#083344",
        },
        neon: {
          pink: "#f472b6",
          purple: "#a855f7",
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
          "0%": { boxShadow: "0 0 20px rgba(139, 92, 246, 0.4)" },
          "100%": { boxShadow: "0 0 40px rgba(139, 92, 246, 0.8)" },
        },
        glowCyan: {
          "0%": { boxShadow: "0 0 20px rgba(6, 182, 212, 0.4)" },
          "100%": { boxShadow: "0 0 40px rgba(6, 182, 212, 0.8)" },
        },
        borderGlow: {
          "0%, 100%": { borderColor: "rgba(139, 92, 246, 0.5)" },
          "50%": { borderColor: "rgba(6, 182, 212, 0.5)" },
        },
      },
      /* ── Background Mesh Gradients ── */
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gradient-mesh":
          "radial-gradient(at 0% 0%, rgba(139, 92, 246, 0.15) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(6, 182, 212, 0.12) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(168, 85, 247, 0.1) 0px, transparent 50%)",
        "gradient-primary":
          "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)",
        "gradient-accent":
          "linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f472b6 100%)",
        "gradient-electric":
          "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #06b6d4 100%)",
        "gradient-dark":
          "linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)",
        "shimmer-gradient":
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
      },
      /* ── Box Shadows for Glow Effects ── */
      boxShadow: {
        "glow-purple": "0 0 25px rgba(139, 92, 246, 0.35)",
        "glow-purple-lg": "0 0 40px rgba(139, 92, 246, 0.5)",
        "glow-cyan": "0 0 25px rgba(6, 182, 212, 0.35)",
        "glow-cyan-lg": "0 0 40px rgba(6, 182, 212, 0.5)",
        "glow-sm": "0 0 15px rgba(139, 92, 246, 0.25)",
        "inner-glow": "inset 0 0 30px rgba(139, 92, 246, 0.05)",
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
        "card-hover": "0 20px 40px -12px rgba(139, 92, 246, 0.25)",
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
