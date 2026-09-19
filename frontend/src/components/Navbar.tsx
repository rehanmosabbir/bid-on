"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const links = [
  { href: "/", label: "Home" },
  { href: "/auctions", label: "Auctions" },
  { href: "/categories", label: "Categories" },
  { href: "/dashboard", label: "My Bids" },
  { href: "/support", label: "Support" },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--paper)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--ink)]"
        >
          Bid On
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm tracking-wide transition ${
                pathname === l.href
                  ? "text-[var(--accent)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user?.role === "seller" || user?.role === "admin" ? (
            <Link
              href="/sell/new"
              className="text-sm text-[var(--accent)] hover:underline"
            >
              Sell
            </Link>
          ) : null}
          {user?.role === "admin" ? (
            <Link
              href="/admin"
              className="text-sm text-[var(--ink)] hover:underline"
            >
              Admin
            </Link>
          ) : null}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          {loading ? null : user ? (
            <>
              <Link href="/account" className="text-[var(--ink)]">
                {user.name}
              </Link>
              <button
                onClick={() => logout()}
                className="rounded-full border border-[var(--line)] px-3 py-1.5 text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="text-[var(--muted)]">
                Log in
              </Link>
              <Link
                href="/auth/register"
                className="rounded-full bg-[var(--ink)] px-4 py-2 text-[var(--paper)]"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
