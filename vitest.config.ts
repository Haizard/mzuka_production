import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    hookTimeout: 30000,
    testTimeout: 15000,
    setupFiles: ["./src/tests/setup.ts"],
    sequence: {
      concurrent: false,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
