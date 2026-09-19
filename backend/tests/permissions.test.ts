import { describe, expect, it } from "vitest";
import { hasPermission, ROLE_PERMISSIONS } from "../src/lib/permissions";

describe("backend permissions", () => {
  it("denies listing:create to buyers", () => {
    expect(hasPermission("buyer", "listing:create")).toBe(false);
    expect(hasPermission("seller", "listing:create")).toBe(true);
    expect(hasPermission("admin", "listing:approve")).toBe(true);
  });

  it("keeps admin without account:switch_role", () => {
    expect(ROLE_PERMISSIONS.admin).not.toContain("account:switch_role");
  });
});
