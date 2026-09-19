"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export { useAuth, useAuthStore } from "@/stores/auth-store";

/** Hydrates the Zustand auth store on mount (replaces AuthContext provider). */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const refresh = useAuthStore((s) => s.refresh);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return <>{children}</>;
}
