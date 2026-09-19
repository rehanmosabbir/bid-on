"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { api, Auction, formatBdt, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useSocket } from "@/lib/socket";

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const socket = useSocket();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [watching, setWatching] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    const data = await api<{ auction: Auction; watching: boolean }>(
      `/api/auctions/${id}`
    );
    setAuction(data.auction);
    setWatching(data.watching);
    const min =
      Number(data.auction.currentBid) > 0
        ? Number(data.auction.currentBid) + 1
        : Number(data.auction.startPrice);
    setAmount(String(min));
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit("auction:join", id);
    const onBid = (payload: {
      bid: Auction["bids"] extends (infer B)[] | undefined ? B : never;
      currentBid: number;
      bidCount: number;
    }) => {
      setAuction((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentBid: payload.currentBid,
          bidCount: payload.bidCount,
          bids: [payload.bid as never, ...(prev.bids || [])].slice(0, 20),
        };
      });
      setAmount(String(Number(payload.currentBid) + 1));
    };
    const onEnd = () => load();
    socket.on("bid:new", onBid);
    socket.on("auction:ended", onEnd);
    return () => {
      socket.emit("auction:leave", id);
      socket.off("bid:new", onBid);
      socket.off("auction:ended", onEnd);
    };
  }, [socket, id]);

  async function placeBid(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api(`/api/auctions/${id}/bids`, {
        method: "POST",
        body: JSON.stringify({ amount: Number(amount) }),
      });
      setMessage("Bid placed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bid failed");
    }
  }

  async function toggleWatch() {
    if (!user) return;
    if (watching) {
      await api(`/api/watchlist/${id}`, { method: "DELETE" });
      setWatching(false);
    } else {
      await api(`/api/watchlist/${id}`, { method: "POST" });
      setWatching(true);
    }
  }

  if (!auction) {
    return <p className="mx-auto max-w-6xl px-4 py-16 text-[var(--muted)]">{error || "Loading…"}</p>;
  }

  const image = mediaUrl(auction.images[0]);
  const canPay =
    user &&
    auction.winner?.id === user.id &&
    ["ended", "sold"].includes(auction.status);

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <div className="overflow-hidden border border-[var(--line)] bg-[var(--ink)]/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={auction.title} className="aspect-[4/3] w-full object-cover" />
        </div>
        <h1 className="mt-8 font-[family-name:var(--font-display)] text-4xl">
          {auction.title}
        </h1>
        <p className="mt-2 text-sm uppercase tracking-[0.16em] text-[var(--muted)]">
          {auction.category?.name} · {auction.status}
        </p>
        <p className="mt-6 whitespace-pre-wrap leading-relaxed text-[var(--muted)]">
          {auction.description}
        </p>
        <div className="mt-10">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Bid history</h2>
          <ul className="mt-4 divide-y divide-[var(--line)] border-t border-[var(--line)]">
            {(auction.bids || []).map((b) => (
              <li key={b.id} className="flex justify-between py-3 text-sm">
                <span>{b.bidder.name}</span>
                <span className="font-medium">{formatBdt(b.amount)}</span>
              </li>
            ))}
            {(auction.bids || []).length === 0 && (
              <li className="py-4 text-[var(--muted)]">No bids yet.</li>
            )}
          </ul>
        </div>
      </div>

      <aside className="panel h-fit p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Current bid</p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--accent)]">
          {formatBdt(
            Number(auction.currentBid) > 0 ? auction.currentBid : auction.startPrice
          )}
        </p>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Time left · <Countdown endsAt={auction.endsAt} />
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {auction.bidCount} bids · Seller {auction.seller?.name}
        </p>

        {auction.status === "live" && user ? (
          <form onSubmit={placeBid} className="mt-6 space-y-3">
            <input
              className="field"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button className="btn btn-accent w-full" type="submit">
              Place bid
            </button>
          </form>
        ) : auction.status === "live" ? (
          <Link href="/auth/login" className="btn btn-primary mt-6 w-full">
            Log in to bid
          </Link>
        ) : null}

        {user && (
          <button className="btn btn-ghost mt-3 w-full" onClick={toggleWatch}>
            {watching ? "Remove watchlist" : "Add to watchlist"}
          </button>
        )}

        {canPay && (
          <Link href={`/checkout/${auction.id}`} className="btn btn-primary mt-3 w-full">
            Pay now
          </Link>
        )}

        {user &&
          ["ended", "sold"].includes(auction.status) &&
          (user.id === auction.winner?.id || user.id === auction.seller?.id) && (
            <form
              className="mt-4 space-y-2 border-t border-[var(--line)] pt-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                try {
                  await api("/api/reviews", {
                    method: "POST",
                    body: JSON.stringify({
                      auctionId: auction.id,
                      rating: Number(fd.get("rating")),
                      comment: String(fd.get("comment") || ""),
                    }),
                  });
                  setMessage("Review submitted.");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Review failed");
                }
              }}
            >
              <p className="text-sm font-medium">Leave a rating</p>
              <select name="rating" className="field" defaultValue="5">
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} stars
                  </option>
                ))}
              </select>
              <input name="comment" className="field" placeholder="Comment (optional)" />
              <button className="btn btn-ghost w-full" type="submit">
                Submit review
              </button>
            </form>
          )}

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        {message && <p className="mt-3 text-sm text-[var(--accent)]">{message}</p>}
      </aside>
    </div>
  );
}
