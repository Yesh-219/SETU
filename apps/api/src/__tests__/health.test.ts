import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";

// We import the app directly – no live DB connection needed.
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const { app } = await import("../app.js");
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

afterAll(() => {
  server?.close();
});

describe("GET /api/v1/health", () => {
  it("returns 200 with success:true and status:ok", async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { success: boolean; data: { status: string; timestamp: string; version: string } };
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("ok");
    expect(typeof body.data.timestamp).toBe("string");
    expect(typeof body.data.version).toBe("string");
  });
});

describe("Unknown route", () => {
  it("returns 404 with success:false", async () => {
    const res = await fetch(`${baseUrl}/api/v1/does-not-exist`);
    expect(res.status).toBe(404);

    const body = (await res.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe("string");
  });
});
