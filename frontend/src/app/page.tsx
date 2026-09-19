"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuctionCard } from "@/components/AuctionCard";
import { api, Auction } from "@/lib/api";

export default function HomePage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    api<{ auctions: Auction[] }>("/api/auctions?status=live")
      .then((d) => setAuctions(d.auctions.slice(0, 6)))
      .catch(console.error);
  }, []);

  return (
    <div>
      <section className="relative min-h-[78vh] overflow-hidden border-b border-[var(--line)]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=1800&q=80)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--ink)]/88 via-[var(--ink)]/70 to-[var(--ink)]/35" />
        <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 text-[var(--paper)]">
          <p className="animate-rise text-xs uppercase tracking-[0.35em] text-[var(--paper)]/70">
            Online auction platform
          </p>
          <h1 className="animate-rise-delay mt-3 max-w-2xl font-[family-name:var(--font-display)] text-5xl leading-[1.05] sm:text-7xl">
            Bid On
          </h1>
          <p className="mt-4 max-w-xl text-lg text-[var(--paper)]/80 animate-rise-delay">
            Transparent live auctions with admin-approved listings, real-time
            bidding, and secure checkout in BDT.
          </p>
          <form
            className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = `/auctions?q=${encodeURIComponent(q)}`;
            }}
          >
            <input
              className="field flex-1 bg-white/95"
              placeholder="Search auctions…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="btn btn-accent" type="submit">
              Search
            </button>
          </form>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/auctions" className="btn btn-ghost border-white/30 text-white">
              Browse live
            </Link>
            <Link href="/auth/register" className="btn btn-primary bg-[var(--paper)] text-[var(--ink)]">
              Start bidding
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              Featured
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
              Live right now
            </h2>
          </div>
          <Link href="/auctions" className="text-sm text-[var(--accent)]">
            View all
          </Link>
        </div>
        <div className="mt-8 divide-y divide-[var(--line)] border-t border-[var(--line)]">
          {auctions.length === 0 ? (
            <p className="py-10 text-[var(--muted)]">No live auctions yet.</p>
          ) : (
            auctions.map((a) => <AuctionCard key={a.id} auction={a} />)
          )}
        </div>
      </section>
    </div>
  );
}
