import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "./auth-store";
import type { User } from "@/lib/api";

const sampleUser: User = {
  id: "1",
  name: "Ada",
  email: "ada@bidon.local",
  role: "buyer",
  phone: null,
  address: null,
  verified: true,
};

describe("useAuthStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, loading: true });
  });

  it("setSession stores token and user", () => {
    useAuthStore.getState().setSession("tok-123", sampleUser);
    expect(localStorage.getItem("token")).toBe("tok-123");
    expect(useAuthStore.getState().user?.email).toBe("ada@bidon.local");
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it("logout clears session", async () => {
    localStorage.setItem("token", "tok");
    useAuthStore.setState({ user: sampleUser, loading: false });
    await useAuthStore.getState().logout();
    expect(localStorage.getItem("token")).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
