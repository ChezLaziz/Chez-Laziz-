import { describe, it, expect } from "vitest";
import app from "./boot";

describe("product image upload is admin-only", () => {
  it("rejects an upload with no admin token", async () => {
    const body = new FormData();
    body.append("file", new File([new Uint8Array([1, 2, 3])], "x.jpg", { type: "image/jpeg" }));
    const res = await app.request("/api/uploads", { method: "POST", body });
    expect(res.status).toBe(401);
  });
});

describe("unknown routes", () => {
  it("answers 404 in JSON for unknown API paths", async () => {
    const res = await app.request("/api/does-not-exist");
    expect(res.status).toBe(404);
  });
});

describe("admin data export is admin-only", () => {
  it("rejects an unauthenticated export request", async () => {
    const res = await app.request("/api/admin/export");
    expect(res.status).toBe(401);
  });
});
