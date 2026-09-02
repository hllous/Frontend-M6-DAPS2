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
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Pinned brand palette (PRODUCT.md Brand Commitments) — institutional
        // navy as primary, coral reserved for accent/urgent/destructive only.
        navy: {
          DEFAULT: "#0F2C59",
          light: "#163D75",
        },
        coral: {
          DEFAULT: "#D63031",
          light: "#E74C3C",
        },
      },
    },
  },
  plugins: [],
};
export default config;
