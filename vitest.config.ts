import { defineConfig } from "vitest/config";

// The Bloom Pilates app in pilates/ has its own test run (cd pilates && npm test).
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    exclude: ["pilates/**", "node_modules/**"],
  },
});
