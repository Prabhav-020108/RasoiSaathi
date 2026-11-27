import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        saffron: {
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          500: "#F97316",
          600: "#EA580C",
          700: "#C2410C",
        },
        rasoi: {
          bg: "#FFF7ED",
          surface: "#FFFFFF",
          primary: "#F97316",
          "primary-dark": "#EA580C",
          accent: "#7C3AED",
          "accent-light": "#EDE9FE",
          text: "#1C1917",
          muted: "#78716C",
          success: "#16A34A",
          warning: "#EAB308",
          danger: "#DC2626",
          info: "#2563EB",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-plus-jakarta)",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 2px 12px -2px rgba(28, 25, 23, 0.06), 0 1px 3px 0 rgba(28, 25, 23, 0.04)",
        mic: "0 8px 24px -4px rgba(124, 58, 237, 0.42)",
        phone: "0 24px 60px -12px rgba(28, 25, 23, 0.22)",
      },
    },
  },
  plugins: [],
};

export default config;
