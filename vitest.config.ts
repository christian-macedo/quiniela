import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    css: false,
    include: ["**/__tests__/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "app/**/*.{ts,tsx}"],
      exclude: [
        "**/__tests__/**",
        "**/components/ui/**",
        "app/globals.css",
        "app/layout.tsx",
        "**/*.d.ts",
      ],
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
    },
  },
});
