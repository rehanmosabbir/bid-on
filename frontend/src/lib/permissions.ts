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

export type AppRole = "buyer" | "seller" | "admin";

export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
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

export function hasPermission(
  role: AppRole | null | undefined,
  permission: Permission
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(
  role: AppRole | null | undefined,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}
