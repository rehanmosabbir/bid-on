"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  useAdminAuctions,
  useApproveAuction,
  useRejectAuction,
} from "@/hooks/queries";
import { Auction, formatBdt, mediaUrl } from "@/lib/api";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function ListingCard({
  auction,
  actions,
}: {
  auction: Auction;
  actions?: ReactNode;
}) {
  const images = Array.isArray(auction.images) ? auction.images : [];

  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-4 pt-6">
        <div className="min-w-0 flex-1">
          <div className="flex gap-3">
            {images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl(images[0])}
                alt=""
                className="h-16 w-20 rounded-md object-cover"
              />
            ) : null}
            <div>
              <Link
                href={`/auctions/${auction.id}`}
                className="text-lg font-medium hover:underline"
              >
                {auction.title}
              </Link>
              <p className="text-sm text-muted-foreground">
                {formatBdt(auction.startPrice)} · {auction.seller?.name} ·{" "}
                {auction.category?.name}
                {images.length > 1 ? ` · ${images.length} images` : ""}
              </p>
            </div>
          </div>
          <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
            {auction.description}
          </p>
          {auction.rejectReason ? (
            <p className="mt-2 text-sm text-destructive">
              Rejected: {auction.rejectReason}
            </p>
          ) : null}
        </div>
        {actions}
      </CardContent>
    </Card>
  );
}

export default function AdminApprovalsPage() {
  const allQ = useAdminAuctions(undefined, true);
  const approve = useApproveAuction();
  const reject = useRejectAuction();
  const [reason, setReason] = useState("Does not meet guidelines");
  const auctions = allQ.data?.auctions || [];
  const pending = auctions.filter((auction) => auction.status === "pending");
  const reviewed = auctions.filter((auction) => auction.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review new listings, and look back at ones already approved or
          rejected.
        </p>
      </div>

      {allQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading listings…</p>
      ) : allQ.isError ? (
        <p className="text-sm text-destructive">
          {allQ.error instanceof Error
            ? allQ.error.message
            : "Could not load listings"}
        </p>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="reviewed">
              Previously reviewed ({reviewed.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3">
            <Input
              className="max-w-md"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reject reason"
            />
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending listings.</p>
            ) : (
              pending.map((auction) => (
                <ListingCard
                  key={auction.id}
                  auction={auction}
                  actions={
                    <div className="flex gap-2">
                      <Button
                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                        onClick={async () => {
                          try {
                            await approve.mutateAsync(auction.id);
                            toastSuccess(`Approved “${auction.title}”`);
                          } catch (err) {
                            toastFromError(err, "Approve failed");
                          }
                        }}
                        disabled={approve.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          try {
                            await reject.mutateAsync({
                              id: auction.id,
                              reason,
                            });
                            toastSuccess(`Rejected “${auction.title}”`);
                          } catch (err) {
                            toastFromError(err, "Reject failed");
                          }
                        }}
                        disabled={reject.isPending}
                      >
                        Reject
                      </Button>
                    </div>
                  }
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="reviewed" className="space-y-3">
            {reviewed.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No reviewed listings yet.
              </p>
            ) : (
              reviewed.map((auction) => (
                <ListingCard
                  key={auction.id}
                  auction={auction}
                  actions={
                    <Badge variant="secondary" className="uppercase">
                      {auction.status}
                    </Badge>
                  }
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
