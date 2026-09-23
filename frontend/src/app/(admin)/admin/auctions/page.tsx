"use client";

import Link from "next/link";
import { useAdminAuctions } from "@/hooks/queries";
import { formatBdt } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminAuctionsPage() {
  const auctionsQ = useAdminAuctions(undefined, true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auctions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse all listings across the platform.
        </p>
      </div>

      <Card className="py-0">
        <CardContent className="divide-y divide-border p-0">
          {(auctionsQ.data?.auctions || []).map((a) => (
            <Link
              key={a.id}
              href={`/auctions/${a.id}`}
              className="flex justify-between gap-4 p-4 hover:bg-muted/50"
            >
              <span className="flex items-center gap-2">
                {a.title}
                <Badge variant="secondary" className="uppercase">
                  {a.status}
                </Badge>
              </span>
              <span>
                {formatBdt(
                  Number(a.currentBid) > 0 ? a.currentBid : a.startPrice
                )}
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
