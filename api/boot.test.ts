import { describe, it, expect } from "vitest";
import app from "./boot";

describe("payment proof storage is never public", () => {
  it("rejects viewing a D17 proof without an admin token", async () => {
    const res = await app.request("/api/admin/proofs/payment-proof/some-key.jpg");
    expect(res.status).toBe(401);
  });

  it("rejects viewing a D17 proof with a garbage token", async () => {
    const res = await app.request("/api/admin/proofs/payment-proof/some-key.jpg", {
      headers: { Authorization: "Bearer not-a-real-token" },
    });
    expect(res.status).toBe(401);
  });

  it("the public product-image route never serves a payment-proof key", async () => {
    const res = await app.request("/api/uploads/payment-proof/some-key.jpg");
    expect(res.status).toBe(404);
  });
});

describe("product image upload is admin-only", () => {
  it("rejects an upload with no admin token", async () => {
    const body = new FormData();
    body.append("file", new File([new Uint8Array([1, 2, 3])], "x.jpg", { type: "image/jpeg" }));
    const res = await app.request("/api/uploads", { method: "POST", body });
    expect(res.status).toBe(401);
  });
});

describe("D17 payment-proof upload endpoint", () => {
  it("rejects a request with no file", async () => {
    const res = await app.request("/api/uploads/payment-proof", {
      method: "POST",
      body: new FormData(),
    });
    expect(res.status).toBe(400);
  });
});

describe("admin data export is admin-only", () => {
  it("rejects an unauthenticated export request", async () => {
    const res = await app.request("/api/admin/export");
    expect(res.status).toBe(401);
  });
});
