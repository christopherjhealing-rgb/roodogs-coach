import type { Config } from "tailwindcss";

// Bloom palette: deep forest ground, mint type, pale-mint cards.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#1F3B2E",
          deep: "#172D23",
          soft: "#2A4A3A",
          line: "#365B48",
        },
        mint: {
          DEFAULT: "#B9F5C7",
          bright: "#D2FFDC",
          pale: "#DDFFE6",
          soft: "#C9F7D6",
          dim: "#8FCFA2",
        },
        ink: {
          DEFAULT: "#14291F",
          soft: "#2F4A3C",
        },
        blush: "#F6D7C3",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
