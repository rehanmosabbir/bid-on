"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  hasPermission,
  type Permission,
} from "@/lib/permissions";
import { toastError } from "@/lib/toast";

type Props = {
  permission?: Permission;
  /** If true, only requires a logged-in user (any role). */
  authOnly?: boolean;
  children: React.ReactNode;
};

export function RequirePermission({
  permission,
  authOnly = false,
  children,
}: Props) {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    if (!authOnly && permission && !hasPermission(user.role, permission)) {
      toastError("You do not have permission to view this page");
      router.replace("/dashboard");
    }
  }, [loading, user, permission, authOnly, router]);

  if (loading) {
    return (
      <p className="mx-auto max-w-6xl px-4 py-16 text-muted-foreground">
        Loading…
      </p>
    );
  }

  if (!user) return null;

  if (!authOnly && permission && !hasPermission(user.role, permission)) {
    return null;
  }

  return <>{children}</>;
}

export function useHasPermission(permission: Permission): boolean {
  const user = useAuth((s) => s.user);
  return hasPermission(user?.role, permission);
}
