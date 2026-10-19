import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Explicitly scope to this workspace's own test files only.
    include: ["src/__tests__/**/*.test.ts"],
  },
});
