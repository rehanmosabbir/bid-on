import Link from "next/link";
import { Auction, formatBdt, mediaUrl } from "@/lib/api";
import { Countdown } from "./Countdown";

export function AuctionCard({ auction }: { auction: Auction }) {
  const image = mediaUrl(auction.images?.[0] || "");
  const price =
    Number(auction.currentBid) > 0 ? auction.currentBid : auction.startPrice;

  return (
    <Link
      href={`/auctions/${auction.id}`}
      className="group block border-b border-[var(--line)] py-6 transition hover:bg-[var(--surface-2)]/60"
    >
      <div className="grid grid-cols-[120px_1fr] gap-5 sm:grid-cols-[160px_1fr_auto]">
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--ink)]/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={auction.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            {auction.category?.name || "Auction"}
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)] sm:text-2xl">
            {auction.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
            {auction.description}
          </p>
          <p className="mt-3 text-sm text-[var(--muted)]">
            {auction.bidCount} bids · {auction.seller?.name}
          </p>
        </div>
        <div className="col-span-2 flex items-end justify-between gap-4 sm:col-span-1 sm:flex-col sm:items-end sm:justify-between">
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
              Current
            </p>
            <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--accent)]">
              {formatBdt(price)}
            </p>
          </div>
          <div className="text-right text-sm text-[var(--ink)]">
            <Countdown endsAt={auction.endsAt} />
          </div>
        </div>
      </div>
    </Link>
  );
}
