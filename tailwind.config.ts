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
        vitta: {
          DEFAULT: "#7950A5",
          pink: "#D98CB3",
          background: "#F8F5FA",
          surface: "#FFFFFF",
          border: "#E9E0EF",
          text: "#352B3D",
          muted: "#766C7D",
        },
      },
      boxShadow: {
        card: "0 12px 32px rgb(53 43 61 / 8%)",
      },
    },
  },
  plugins: [],
};

export default config;
