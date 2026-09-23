import { describe, expect, it, beforeEach, afterEach } from "vitest";
import MockAdapter from "axios-mock-adapter";
import { api, apiClient, formatBdt, mediaUrl, API_URL } from "@/lib/api";
import {
  loginSchema,
  registerSchema,
  bidSchema,
  verifySchema,
} from "@/lib/schemas";

describe("formatBdt", () => {
  it("formats numbers as BDT currency", () => {
    const formatted = formatBdt(5100);
    expect(formatted).toContain("5,100");
    expect(formatted.replace(/\s/g, "")).toMatch(/৳|BDT|Tk/i);
  });

  it("accepts string amounts", () => {
    expect(formatBdt("2500")).toContain("2,500");
  });
});

describe("mediaUrl", () => {
  it("returns empty for blank input", () => {
    expect(mediaUrl("")).toBe("");
  });

  it("passes through absolute urls", () => {
    expect(mediaUrl("https://cdn.example/a.jpg")).toBe(
      "https://cdn.example/a.jpg"
    );
  });

  it("prefixes relative upload paths with API url", () => {
    expect(mediaUrl("/uploads/x.png")).toBe(`${API_URL}/uploads/x.png`);
  });
});

describe("zod schemas", () => {
  it("accepts valid login payload", () => {
    const result = loginSchema.safeParse({
      email: "buyer@bidon.local",
      password: "Password1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email on login", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "x",
    });
    expect(result.success).toBe(false);
  });

  it("enforces strong register password", () => {
    expect(
      registerSchema.safeParse({
        name: "Ada",
        email: "ada@example.com",
        password: "weak",
        role: "buyer",
      }).success
    ).toBe(false);

    expect(
      registerSchema.safeParse({
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "Password1",
        role: "seller",
      }).success
    ).toBe(true);
  });

  it("requires positive bid amount", () => {
    expect(bidSchema.safeParse({ amount: 0 }).success).toBe(false);
    expect(bidSchema.safeParse({ amount: 100 }).success).toBe(true);
  });

  it("requires a verification token", () => {
    expect(verifySchema.safeParse({ token: "short" }).success).toBe(false);
    expect(
      verifySchema.safeParse({
        token: "a".repeat(64),
      }).success
    ).toBe(true);
  });
});

describe("api axios client", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    localStorage.clear();
  });

  afterEach(() => {
    mock.restore();
  });

  it("GETs JSON successfully", async () => {
    mock.onGet("/api/health").reply(200, { ok: true });
    const data = await api<{ ok: boolean }>("/api/health");
    expect(data.ok).toBe(true);
  });

  it("POSTs JSON body via data", async () => {
    mock.onPost("/api/auth/login").reply((config) => {
      const body = JSON.parse(config.data as string);
      expect(body.email).toBe("buyer@bidon.local");
      return [200, { token: "t", user: { id: "1", name: "Buyer" } }];
    });

    const data = await api<{ token: string }>("/api/auth/login", {
      method: "POST",
      data: { email: "buyer@bidon.local", password: "Password1" },
    });
    expect(data.token).toBe("t");
  });

  it("attaches bearer token from localStorage", async () => {
    localStorage.setItem("token", "abc123");
    mock.onGet("/api/auth/me").reply((config) => {
      expect(config.headers?.Authorization).toBe("Bearer abc123");
      return [200, { user: { id: "1" } }];
    });
    await api("/api/auth/me");
  });

  it("throws Error with API error message", async () => {
    mock.onPost("/api/auth/login").reply(401, { error: "Invalid credentials" });
    await expect(
      api("/api/auth/login", {
        method: "POST",
        data: { email: "x@y.com", password: "bad" },
      })
    ).rejects.toThrow("Invalid credentials");
  });

  it("supports legacy body JSON string", async () => {
    mock.onPost("/api/reviews").reply((config) => {
      const body = JSON.parse(config.data as string);
      expect(body.rating).toBe(5);
      return [201, { ok: true }];
    });
    await api("/api/reviews", {
      method: "POST",
      body: JSON.stringify({ rating: 5 }),
    });
  });
});
