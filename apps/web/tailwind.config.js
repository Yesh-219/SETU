/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Setu design tokens ──────────────────────────────────
        "setu-primary":    "#0F766E",
        "setu-primary-lt": "#CCFBF1",
        "setu-bg":         "#F8FAFC",
        "setu-card":       "#FFFFFF",
        "setu-text":       "#0F172A",
        "setu-muted":      "#64748B",
        "setu-border":     "#E2E8F0",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
