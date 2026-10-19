import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Root-level tests: no DOM needed (SQL/file system checks only).
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
});
