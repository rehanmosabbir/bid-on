"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Moon, Sun, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/permissions";
import { useThemeStore } from "@/stores/theme-store";
import { toastSuccess } from "@/lib/toast";

type NavLink = {
  href: string;
  label: string;
  /** Only show when logged in */
  auth?: boolean;
  /** Only show when the user has this permission */
  permission?: Permission;
};

const links: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/auctions", label: "Auctions" },
  { href: "/categories", label: "Categories" },
  { href: "/dashboard", label: "Dashboard", auth: true },
  { href: "/sell/new", label: "Sell", permission: "listing:create" },
  { href: "/admin", label: "Admin", permission: "admin:access" },
  { href: "/support", label: "Support" },
];

function canSeeLink(
  link: NavLink,
  role: Parameters<typeof hasPermission>[0],
  loggedIn: boolean
) {
  if (link.permission) return hasPermission(role, link.permission);
  if (link.auth) return loggedIn;
  return true;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const loading = useAuth((s) => s.loading);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const visibleLinks = links.filter((l) =>
    canSeeLink(l, user?.role, Boolean(user))
  );
  const canSell = hasPermission(user?.role, "listing:create");
  const canAdmin = hasPermission(user?.role, "admin:access");

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-xl"
      style={{
        background: "color-mix(in srgb, var(--nav-bg) 92%, transparent)",
        color: "var(--nav-fg)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-2xl tracking-tight"
        >
          Bid On
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {visibleLinks.map((l) => {
            const active = pathname === l.href;
            const accent = l.permission === "listing:create";
            return (
              <Link
                key={l.href}
                href={l.href}
                className="relative text-xs font-semibold uppercase tracking-[0.18em] transition"
                style={{
                  color: accent
                    ? "var(--brand-hot)"
                    : active
                      ? "var(--nav-fg)"
                      : "var(--nav-muted)",
                }}
              >
                {l.label}
                {active ? (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-[var(--brand-hot)]"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="border-white/20 bg-transparent text-[var(--nav-fg)] hover:bg-white/10 hover:text-white"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon /> : <Sun />}
          </Button>
          {loading ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/20 bg-transparent px-2.5 text-xs text-[var(--nav-fg)] hover:bg-white/10"
              >
                <UserRound className="size-3.5" />
                <span className="hidden sm:inline">{user.name}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem onClick={() => router.push("/account")}>
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                  Dashboard
                </DropdownMenuItem>
                {canSell && (
                  <DropdownMenuItem onClick={() => router.push("/sell/new")}>
                    Sell
                  </DropdownMenuItem>
                )}
                {canAdmin && (
                  <DropdownMenuItem onClick={() => router.push("/admin")}>
                    Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    toastSuccess("Logged out");
                    router.push("/auth/login");
                  }}
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link href="/auth/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[var(--nav-muted)] hover:bg-white/10 hover:text-white"
                >
                  Log in
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button
                  size="sm"
                  className="bg-white text-[var(--on-light)] hover:bg-[var(--brand-hot)] hover:text-white"
                >
                  Register
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
