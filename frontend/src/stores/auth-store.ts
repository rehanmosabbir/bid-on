"use client";

import { create } from "zustand";
import { api, User } from "@/lib/api";

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setSession: (token: string, user: User) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  setSession: (token, user) => {
    localStorage.setItem("token", token);
    set({ user, loading: false });
  },

  refresh: async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      set({ user: null, loading: false });
      return;
    }
    try {
      const data = await api<{ user: User }>("/api/auth/me");
      set({ user: data.user, loading: false });
    } catch {
      localStorage.removeItem("token");
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    const data = await api<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      data: { email, password },
    });
    localStorage.setItem("token", data.token);
    set({ user: data.user, loading: false });
    return data.user;
  },

  logout: async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    localStorage.removeItem("token");
    set({ user: null });
  },
}));

/** Auth hook — supports Zustand selectors: `useAuth(s => s.user)`. */
export const useAuth = useAuthStore;
