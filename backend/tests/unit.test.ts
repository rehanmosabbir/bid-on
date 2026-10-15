import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { param } from "../src/lib/params";
import { signToken } from "../src/lib/auth";
import { minimumNextBid } from "../src/lib/bidding";
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

describe("minimumNextBid", () => {
  it("adds the seller increment to the opening price when nobody has bid", () => {
    expect(
      minimumNextBid({ currentBid: 0, startPrice: 500, minBidIncrement: 100 })
    ).toBe(600);
  });

  it("requires the seller increment above the current bid", () => {
    expect(
      minimumNextBid({ currentBid: 500, startPrice: 100, minBidIncrement: 50 })
    ).toBe(550);
  });

  it("defaults the gap to 1", () => {
    expect(
      minimumNextBid({ currentBid: 10, startPrice: 5, minBidIncrement: null })
    ).toBe(11);
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
