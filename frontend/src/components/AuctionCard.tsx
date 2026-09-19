"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Auction, formatBdt, mediaUrl } from "@/lib/api";
import { Countdown } from "./Countdown";

export function AuctionCard({ auction }: { auction: Auction }) {
  const image = mediaUrl(auction.images?.[0] || "");
  const price =
    Number(auction.currentBid) > 0 ? auction.currentBid : auction.startPrice;

  return (
    <Link href={`/auctions/${auction.id}`} className="group block">
      <motion.article
        whileHover={{ x: 4 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-[110px_1fr] gap-5 border-b border-border py-7 sm:grid-cols-[180px_1fr_auto] sm:gap-8"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={auction.title}
            className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
          />
        </div>
        <div className="min-w-0 self-center">
          <Badge variant="secondary" className="uppercase tracking-wider">
            {auction.category?.name || "Auction"}
          </Badge>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-tight sm:text-3xl">
            {auction.title}
          </h3>
          <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {auction.description}
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {auction.bidCount} bids · {auction.seller?.name}
          </p>
        </div>
        <div className="col-span-2 flex items-end justify-between gap-4 sm:col-span-1 sm:flex-col sm:items-end sm:justify-center sm:gap-3">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Current
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-primary sm:text-3xl">
              {formatBdt(price)}
            </p>
          </div>
          <div className="text-right text-sm font-medium tabular-nums text-primary">
            <Countdown endsAt={auction.endsAt} />
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
