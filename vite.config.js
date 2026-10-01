import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/PennyLedger/",
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./tests/setup.js",
    css: false,
    restoreMocks: true,
  },
});
