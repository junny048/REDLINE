import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f7f8fa",
        panel: "#ffffff",
        ink: "#0f172a",
        accent: "#1d4ed8",
        danger: "#dc2626"
      }
    }
  },
  plugins: []
};

export default config;
