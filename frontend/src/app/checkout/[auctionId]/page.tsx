"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { api, Auction, formatBdt } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function CheckoutInner() {
  const { auctionId } = useParams<{ auctionId: string }>();
  const search = useSearchParams();
  const { user } = useAuth();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [message, setMessage] = useState(
    search.get("success") ? "Payment successful." : ""
  );
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ auction: Auction }>(`/api/auctions/${auctionId}`).then((d) =>
      setAuction(d.auction)
    );
  }, [auctionId]);

  async function pay() {
    setError("");
    try {
      const data = await api<{ url?: string; message?: string }>(
        "/api/payments/create-checkout-session",
        {
          method: "POST",
          body: JSON.stringify({ auctionId }),
        }
      );
      if (data.url) window.location.href = data.url;
      else setMessage(data.message || "Paid");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    }
  }

  if (!auction) return <p className="p-10">Loading…</p>;

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Checkout</h1>
      <div className="panel mt-8 space-y-3 p-6">
        <p className="text-lg">{auction.title}</p>
        <p className="text-[var(--muted)]">Amount due</p>
        <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--accent)]">
          {formatBdt(auction.currentBid)}
        </p>
        {user?.id === auction.winner?.id ? (
          <button className="btn btn-accent w-full" onClick={pay}>
            Pay with Stripe
          </button>
        ) : (
          <p className="text-sm text-red-700">Only the auction winner can pay.</p>
        )}
        {message && <p className="text-sm text-[var(--accent)]">{message}</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutInner />
    </Suspense>
  );
}
