"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Auction, formatBdt, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"bids" | "listings" | "watchlist" | "txns">(
    "bids"
  );
  const [bids, setBids] = useState<unknown[]>([]);
  const [listings, setListings] = useState<Auction[]>([]);
  const [watchlist, setWatchlist] = useState<Array<{ auction: Auction }>>([]);
  const [txns, setTxns] = useState<unknown[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api<{ bids: unknown[] }>("/api/users/me/bids").then((d) => setBids(d.bids));
    api<{ auctions: Auction[] }>("/api/users/me/listings").then((d) =>
      setListings(d.auctions)
    );
    api<{ watchlist: Array<{ auction: Auction }> }>("/api/watchlist").then((d) =>
      setWatchlist(d.watchlist)
    );
    api<{ transactions: unknown[] }>("/api/users/me/transactions").then((d) =>
      setTxns(d.transactions)
    );
  }, [user]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Dashboard</h1>
      <p className="mt-2 text-[var(--muted)]">
        Welcome, {user.name} · {user.role}
      </p>
      <div className="mt-8 flex flex-wrap gap-2">
        {(
          [
            ["bids", "My Bids"],
            ["listings", "My Listings"],
            ["watchlist", "Watchlist"],
            ["txns", "Transactions"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            className={`btn ${tab === key ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-8 panel divide-y divide-[var(--line)]">
        {tab === "bids" &&
          (bids as Array<{ id: string; amount: number; auction: Auction }>).map(
            (b) => (
              <Link
                key={b.id}
                href={`/auctions/${b.auction.id}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-[var(--surface-2)]/50"
              >
                <span>{b.auction.title}</span>
                <span>{formatBdt(b.amount)}</span>
              </Link>
            )
          )}
        {tab === "listings" &&
          listings.map((a) => (
            <Link
              key={a.id}
              href={`/auctions/${a.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-[var(--surface-2)]/50"
            >
              <span>
                {a.title}{" "}
                <span className="text-xs uppercase text-[var(--muted)]">
                  {a.status}
                </span>
              </span>
              <span>{formatBdt(a.currentBid || a.startPrice)}</span>
            </Link>
          ))}
        {tab === "watchlist" &&
          watchlist.map((w) => (
            <Link
              key={w.auction.id}
              href={`/auctions/${w.auction.id}`}
              className="flex items-center gap-4 p-4 hover:bg-[var(--surface-2)]/50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(w.auction.images[0])}
                alt=""
                className="h-14 w-20 object-cover"
              />
              <span>{w.auction.title}</span>
            </Link>
          ))}
        {tab === "txns" &&
          (
            txns as Array<{
              id: string;
              amount: number;
              status: string;
              auction: { title: string };
            }>
          ).map((t) => (
            <div key={t.id} className="flex justify-between p-4 text-sm">
              <span>
                {t.auction.title} · {t.status}
              </span>
              <span>{formatBdt(t.amount)}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
