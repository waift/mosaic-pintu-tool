/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // 通过 CSS 变量切换深浅主题,支持 alpha 通道
        base: {
          900: "rgb(var(--c-base-900) / <alpha-value>)",
          800: "rgb(var(--c-base-800) / <alpha-value>)",
          700: "rgb(var(--c-base-700) / <alpha-value>)",
          600: "rgb(var(--c-base-600) / <alpha-value>)",
          500: "rgb(var(--c-base-500) / <alpha-value>)",
          400: "rgb(var(--c-base-400) / <alpha-value>)",
        },
        ink: {
          50: "rgb(var(--c-ink-50) / <alpha-value>)",
          100: "rgb(var(--c-ink-100) / <alpha-value>)",
          200: "rgb(var(--c-ink-200) / <alpha-value>)",
        },
        accent: {
          400: "rgb(var(--c-accent-400) / <alpha-value>)",
          500: "rgb(var(--c-accent-500) / <alpha-value>)",
          600: "rgb(var(--c-accent-600) / <alpha-value>)",
          700: "rgb(var(--c-accent-700) / <alpha-value>)",
        },
        warn: {
          400: "rgb(var(--c-warn-400) / <alpha-value>)",
          500: "rgb(var(--c-warn-500) / <alpha-value>)",
          600: "rgb(var(--c-warn-600) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"Noto Sans SC"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Sarasa Mono SC"', "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "8px",
      },
      boxShadow: {
        "accent-glow": "0 0 0 1px rgb(var(--c-accent-500) / 0.4), 0 8px 24px -8px rgb(var(--c-accent-500) / 0.35)",
        "inner-line": "inset 0 0 0 1px rgb(var(--c-ink-50) / 0.04)",
        "lift": "0 12px 32px -12px rgba(0, 0, 0, 0.6)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "spin-slow": "spin-slow 1.2s linear infinite",
      },
    },
  },
  plugins: [],
};
