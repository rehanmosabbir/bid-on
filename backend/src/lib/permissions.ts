import { Role } from "@prisma/client";
import { Request, Response, NextFunction } from "express";

export const PERMISSIONS = [
  "listing:create",
  "listing:approve",
  "admin:access",
  "admin:users",
  "admin:reports",
  "category:create",
  "bid:place",
  "watchlist:manage",
  "account:switch_role",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: [
    "listing:create",
    "listing:approve",
    "admin:access",
    "admin:users",
    "admin:reports",
    "category:create",
    "bid:place",
    "watchlist:manage",
  ],
  seller: [
    "listing:create",
    "bid:place",
    "watchlist:manage",
    "account:switch_role",
  ],
  buyer: ["bid:place", "watchlist:manage", "account:switch_role"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(
  role: Role,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/** Requires auth + at least one of the given permissions. */
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!hasAnyPermission(req.user.role, permissions)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
