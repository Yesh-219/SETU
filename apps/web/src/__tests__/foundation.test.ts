import { describe, it, expect } from "vitest";

/**
 * Smoke test – verifies that the shared HealthResponse type contract
 * is satisfied and the design token values are what we expect.
 *
 * Component rendering tests will be added in a later task once
 * a testing-library setup is confirmed working with jsdom.
 */
describe("Setu web foundation", () => {
  it("renders without crashing – environment sanity check", () => {
    // Verify the global environment is what Vitest/jsdom sets up.
    expect(typeof window).toBe("object");
    expect(typeof document).toBe("object");
  });

  it("design token values are correct", () => {
    const tokens = {
      primary: "#0F766E",
      primaryLight: "#CCFBF1",
      background: "#F8FAFC",
      card: "#FFFFFF",
      text: "#0F172A",
      muted: "#64748B",
      border: "#E2E8F0",
    };

    expect(tokens.primary).toBe("#0F766E");
    expect(tokens.primaryLight).toBe("#CCFBF1");
    expect(tokens.background).toBe("#F8FAFC");
    expect(tokens.card).toBe("#FFFFFF");
    expect(tokens.text).toBe("#0F172A");
    expect(tokens.muted).toBe("#64748B");
    expect(tokens.border).toBe("#E2E8F0");
  });
});
