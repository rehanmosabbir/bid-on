"use client";

import Link from "next/link";
import {
  useMyBids,
  useMyListings,
  useMyTransactions,
  useWatchlist,
} from "@/hooks/queries";
import { formatBdt, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RequirePermission,
  useHasPermission,
} from "@/components/RequirePermission";

function DashboardInner() {
  const user = useAuth((s) => s.user)!;
  const canList = useHasPermission("listing:create");

  const enabled = Boolean(user);
  const bidsQ = useMyBids(enabled);
  const listingsQ = useMyListings(enabled && canList);
  const watchQ = useWatchlist(enabled);
  const txnsQ = useMyTransactions(enabled);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">
        Dashboard
      </h1>
      <p className="mt-2 text-muted-foreground">
        Welcome, {user.name} · {user.role}
      </p>

      <Tabs defaultValue="bids" className="mt-8">
        <TabsList>
          <TabsTrigger value="bids">My Bids</TabsTrigger>
          {canList && <TabsTrigger value="listings">My Listings</TabsTrigger>}
          <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
          <TabsTrigger value="txns">Transactions</TabsTrigger>
        </TabsList>

        <Card className="mt-4 py-0">
          <CardContent className="divide-y divide-border p-0">
            <TabsContent value="bids" className="mt-0">
              {(bidsQ.data?.bids || []).map((b) => (
                <Link
                  key={b.id}
                  href={`/auctions/${b.auction.id}`}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50"
                >
                  <span>{b.auction.title}</span>
                  <span>{formatBdt(b.amount)}</span>
                </Link>
              ))}
              {(bidsQ.data?.bids || []).length === 0 && (
                <p className="p-4 text-muted-foreground">No bids yet.</p>
              )}
            </TabsContent>

            {canList && (
              <TabsContent value="listings" className="mt-0">
                {(listingsQ.data?.auctions || []).map((a) => (
                  <Link
                    key={a.id}
                    href={`/auctions/${a.id}`}
                    className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50"
                  >
                    <span className="flex items-center gap-2">
                      {a.title}
                      <Badge variant="secondary" className="uppercase">
                        {a.status}
                      </Badge>
                    </span>
                    <span>
                      {formatBdt(
                        Number(a.currentBid) > 0
                          ? a.currentBid
                          : a.startPrice
                      )}
                    </span>
                  </Link>
                ))}
                {(listingsQ.data?.auctions || []).length === 0 && (
                  <p className="p-4 text-muted-foreground">No listings yet.</p>
                )}
              </TabsContent>
            )}

            <TabsContent value="watchlist" className="mt-0">
              {(watchQ.data?.watchlist || []).map((w) => (
                <Link
                  key={w.auction.id}
                  href={`/auctions/${w.auction.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50"
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
              {(watchQ.data?.watchlist || []).length === 0 && (
                <p className="p-4 text-muted-foreground">Watchlist is empty.</p>
              )}
            </TabsContent>

            <TabsContent value="txns" className="mt-0">
              {(txnsQ.data?.transactions || []).map((t) => (
                <div key={t.id} className="flex justify-between p-4 text-sm">
                  <span>
                    {t.auction.title} · {t.status}
                  </span>
                  <span>{formatBdt(t.amount)}</span>
                </div>
              ))}
              {(txnsQ.data?.transactions || []).length === 0 && (
                <p className="p-4 text-muted-foreground">No transactions yet.</p>
              )}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequirePermission authOnly>
      <DashboardInner />
    </RequirePermission>
  );
}
