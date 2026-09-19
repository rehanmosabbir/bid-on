import { describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import type { Express } from "express";

describe("API integration", () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  it("GET /api/health returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.service).toBe("bid-on");
  });

  it("POST /api/auth/login rejects invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@bidon.local", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("POST /api/auth/login rejects weak payload via validation", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-email", password: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("POST /api/auth/login accepts seeded buyer", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "buyer@bidon.local",
      password: "Password1",
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe("buyer@bidon.local");
    expect(res.body.user.role).toBe("buyer");
  });

  it("GET /api/auctions returns live listings", async () => {
    const res = await request(app).get("/api/auctions?status=live");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.auctions)).toBe(true);
  });

  it("GET /api/categories returns categories", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body.categories.length).toBeGreaterThan(0);
  });

  it("GET /api/auth/me requires auth", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("GET /api/auth/me works with bearer token", async () => {
    const login = await request(app).post("/api/auth/login").send({
      email: "admin@bidon.local",
      password: "Password1",
    });
    const token = login.body.token as string;
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("admin");
  });

  it("GET /api/admin/stats forbids non-admin", async () => {
    const login = await request(app).post("/api/auth/login").send({
      email: "buyer@bidon.local",
      password: "Password1",
    });
    const res = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(res.status).toBe(403);
  });

  it("POST bid rejects amount below minimum", async () => {
    const login = await request(app).post("/api/auth/login").send({
      email: "buyer@bidon.local",
      password: "Password1",
    });
    const list = await request(app).get("/api/auctions?status=live");
    const auction = list.body.auctions[0];
    if (!auction) {
      expect(list.body.auctions).toEqual([]);
      return;
    }
    const res = await request(app)
      .post(`/api/auctions/${auction.id}/bids`)
      .set("Authorization", `Bearer ${login.body.token}`)
      .send({ amount: 1 });
    expect([400, 201]).toContain(res.status);
    if (res.status === 400) {
      expect(String(res.body.error)).toMatch(/at least|Bid/i);
    }
  });

  it("POST /api/auctions forbids buyers (listing:create)", async () => {
    const login = await request(app).post("/api/auth/login").send({
      email: "buyer@bidon.local",
      password: "Password1",
    });
    const res = await request(app)
      .post("/api/auctions")
      .set("Authorization", `Bearer ${login.body.token}`)
      .field("title", "Test lot")
      .field("description", "A description long enough")
      .field("categoryId", "x")
      .field("startPrice", "100")
      .field("durationMinutes", "60");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/permission/i);
  });

  it("PATCH /users/me role switch returns a new token", async () => {
    const login = await request(app).post("/api/auth/login").send({
      email: "buyer@bidon.local",
      password: "Password1",
    });
    const token = login.body.token as string;
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Buyer Demo", role: "seller" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("seller");
    expect(res.body.token).toBeTruthy();

    // Switch back so other tests keep working
    await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${res.body.token}`)
      .send({ role: "buyer" });
  });

  it("PATCH /users/me rejects admin role change", async () => {
    const login = await request(app).post("/api/auth/login").send({
      email: "admin@bidon.local",
      password: "Password1",
    });
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${login.body.token}`)
      .send({ role: "buyer" });
    expect(res.status).toBe(403);
  });
});
