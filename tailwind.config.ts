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
        gold: {
          50: "#fdfbf5",
          100: "#faf4e5",
          200: "#f3e6c3",
          300: "#ebd499",
          400: "#dfbd69",
          500: "#c89d38",
          600: "#b48325",
          700: "#91631d",
          800: "#764f1d",
          900: "#63421d",
        },
      },
    },
  },
  plugins: [],
};
export default config;
