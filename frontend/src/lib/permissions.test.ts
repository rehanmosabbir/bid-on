import { describe, expect, it } from "vitest";
import { hasPermission, ROLE_PERMISSIONS } from "./permissions";

describe("permissions", () => {
  it("maps buyer/seller/admin capabilities", () => {
    expect(hasPermission("buyer", "listing:create")).toBe(false);
    expect(hasPermission("seller", "listing:create")).toBe(true);
    expect(hasPermission("admin", "admin:access")).toBe(true);
    expect(hasPermission("seller", "admin:access")).toBe(false);
    expect(hasPermission("admin", "account:switch_role")).toBe(false);
    expect(hasPermission("buyer", "account:switch_role")).toBe(true);
  });

  it("exposes a non-empty matrix for every role", () => {
    expect(ROLE_PERMISSIONS.buyer.length).toBeGreaterThan(0);
    expect(ROLE_PERMISSIONS.seller.length).toBeGreaterThan(0);
    expect(ROLE_PERMISSIONS.admin.length).toBeGreaterThan(0);
  });
});
