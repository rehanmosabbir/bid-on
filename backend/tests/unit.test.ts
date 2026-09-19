import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { param } from "../src/lib/params";
import { signToken } from "../src/lib/auth";
import jwt from "jsonwebtoken";

describe("param helper", () => {
  it("returns string params", () => {
    const req = { params: { id: "abc" } } as unknown as Request;
    expect(param(req, "id")).toBe("abc");
  });

  it("returns first value for array params", () => {
    const req = { params: { id: ["one", "two"] } } as unknown as Request;
    expect(param(req, "id")).toBe("one");
  });

  it("returns empty string when missing", () => {
    const req = { params: {} } as unknown as Request;
    expect(param(req, "id")).toBe("");
  });
});

describe("signToken", () => {
  it("signs a verifiable JWT", () => {
    const token = signToken({
      id: "u1",
      email: "a@b.com",
      role: "buyer",
      name: "Ada",
    });
    const secret = process.env.JWT_SECRET || "bid-on-dev-secret";
    const payload = jwt.verify(token, secret) as { id: string; email: string };
    expect(payload.id).toBe("u1");
    expect(payload.email).toBe("a@b.com");
  });
});
