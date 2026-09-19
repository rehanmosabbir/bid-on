"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuctionCard } from "@/components/AuctionCard";
import { api, Auction } from "@/lib/api";
import { Suspense } from "react";

function AuctionsInner() {
  const params = useSearchParams();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [q, setQ] = useState(params.get("q") || "");
  const [category, setCategory] = useState(params.get("category") || "");
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; slug: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ categories: Array<{ id: string; name: string; slug: string }> }>(
      "/api/categories"
    ).then((d) => setCategories(d.categories));
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ status: "live" });
    if (q) qs.set("q", q);
    if (category) qs.set("category", category);
    api<{ auctions: Auction[] }>(`/api/auctions?${qs}`)
      .then((d) => setAuctions(d.auctions))
      .finally(() => setLoading(false));
  }, [q, category]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">
        Auctions
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Filter by keyword and category. Bids update in real time.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <input
          className="field"
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="field sm:max-w-xs"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-8 border-t border-[var(--line)]">
        {loading ? (
          <p className="py-10 text-[var(--muted)]">Loading…</p>
        ) : auctions.length === 0 ? (
          <p className="py-10 text-[var(--muted)]">No auctions found.</p>
        ) : (
          auctions.map((a) => <AuctionCard key={a.id} auction={a} />)
        )}
      </div>
    </div>
  );
}

export default function AuctionsPage() {
  return (
    <Suspense fallback={<p className="p-10">Loading…</p>}>
      <AuctionsInner />
    </Suspense>
  );
}
