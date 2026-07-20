import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        charcoal: "#161616",
        orange: "#f97316",
      },
      fontFamily: {
        sans: ["Manrope", "Inter", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
