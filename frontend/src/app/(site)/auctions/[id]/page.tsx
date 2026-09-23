"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Countdown } from "@/components/Countdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  queryKeys,
  useAuction,
  usePlaceBid,
  useSubmitReview,
  useToggleWatchlist,
} from "@/hooks/queries";
import { formatBdt, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useSocket } from "@/lib/socket";
import { bidSchema, BidValues, reviewSchema, ReviewValues } from "@/lib/schemas";
import { toastFromError, toastSuccess, toastValidationErrors } from "@/lib/toast";
import { SellerEditPanel } from "@/components/SellerEditPanel";

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const socket = useSocket();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useAuction(id);
  const placeBid = usePlaceBid(id);
  const toggleWatch = useToggleWatchlist(id);
  const submitReview = useSubmitReview();

  const auction = data?.auction;
  const watching = data?.watching ?? false;

  const bidForm = useForm<BidValues>({
    resolver: zodResolver(bidSchema),
  });

  const reviewForm = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5, comment: "" },
  });

  useEffect(() => {
    if (!auction) return;
    const min =
      Number(auction.currentBid) > 0
        ? Number(auction.currentBid) + 1
        : Number(auction.startPrice);
    bidForm.reset({ amount: min });
  }, [auction?.id, auction?.currentBid, auction?.startPrice]);

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit("auction:join", id);
    const onBid = () => {
      qc.invalidateQueries({ queryKey: queryKeys.auction(id) });
    };
    const onEnd = () => refetch();
    socket.on("bid:new", onBid);
    socket.on("auction:ended", onEnd);
    return () => {
      socket.emit("auction:leave", id);
      socket.off("bid:new", onBid);
      socket.off("auction:ended", onEnd);
    };
  }, [socket, id, qc, refetch]);

  if (isLoading) {
    return (
      <p className="mx-auto max-w-6xl px-4 py-16 text-muted-foreground">
        Loading…
      </p>
    );
  }

  if (error || !auction) {
    return (
      <p className="mx-auto max-w-6xl px-4 py-16 text-destructive">
        {error instanceof Error ? error.message : "Auction not found"}
      </p>
    );
  }

  const image = mediaUrl(auction.images[0]);
  const isEnded = ["ended", "sold"].includes(auction.status);
  const isWinner = Boolean(user && auction.winner?.id === user.id);
  const canPay = Boolean(isWinner && isEnded && auction.status !== "sold");
  const alreadyPaid = auction.status === "sold" && isWinner;
  const isOwner = Boolean(user && auction.seller?.id === user.id);
  const canEditListing =
    isOwner &&
    ["pending", "live"].includes(auction.status) &&
    Number(auction.currentBid) === 0 &&
    (auction.bids?.length ?? 0) === 0 &&
    auction.bidCount === 0;

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <div className="overflow-hidden rounded-xl border border-border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={auction.title}
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
        <h1 className="mt-8 font-[family-name:var(--font-display)] text-4xl sm:text-5xl">
          {auction.title}
        </h1>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          {auction.category?.name} · {auction.status}
        </p>
        <p className="mt-6 whitespace-pre-wrap leading-relaxed text-muted-foreground">
          {auction.description}
        </p>
        <div className="mt-10">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Bid history
          </h2>
          <ul className="mt-4 divide-y divide-border border-t border-border">
            {(auction.bids || []).map((b) => (
              <li key={b.id} className="flex justify-between py-3 text-sm">
                <span>{b.bidder.name}</span>
                <span className="font-medium">{formatBdt(b.amount)}</span>
              </li>
            ))}
            {(auction.bids || []).length === 0 && (
              <li className="py-4 text-muted-foreground">No bids yet.</li>
            )}
          </ul>
        </div>
      </div>

      <Card className="sticky top-24 h-fit overflow-hidden py-0">
        <div className="bg-foreground px-6 py-5 text-background">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-background/50">
            Current bid
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl">
            {formatBdt(
              Number(auction.currentBid) > 0
                ? auction.currentBid
                : auction.startPrice
            )}
          </p>
          <p className="mt-3 text-sm text-[var(--brand-hot)]">
            <Countdown endsAt={auction.endsAt} />
          </p>
          <p className="mt-1 text-xs text-background/50">
            {auction.bidCount} bids · Seller {auction.seller?.name}
          </p>
        </div>
        <CardContent className="space-y-3 p-6">
          {canEditListing && <SellerEditPanel auction={auction} />}

          {auction.status === "live" && user && !isOwner ? (
            <form
              onSubmit={bidForm.handleSubmit(
                async (values) => {
                  try {
                    await placeBid.mutateAsync(values.amount);
                    toastSuccess("Bid placed successfully");
                  } catch (err) {
                    const msg = toastFromError(err, "Bid failed");
                    bidForm.setError("root", { message: msg });
                  }
                },
                (formErrors) => toastValidationErrors(formErrors)
              )}
              className="space-y-3"
            >
              <div className="space-y-2">
                <Label htmlFor="bid-amount">Your bid (BDT)</Label>
                <Input
                  id="bid-amount"
                  type="number"
                  min={1}
                  {...bidForm.register("amount")}
                />
              </div>
              {bidForm.formState.errors.amount && (
                <p className="text-sm text-destructive">
                  {bidForm.formState.errors.amount.message}
                </p>
              )}
              {bidForm.formState.errors.root && (
                <p className="text-sm text-destructive">
                  {bidForm.formState.errors.root.message}
                </p>
              )}
              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                type="submit"
                disabled={placeBid.isPending}
              >
                {placeBid.isPending ? "Placing…" : "Place bid"}
              </Button>
            </form>
          ) : auction.status === "live" && !user ? (
            <Link href="/auth/login">
              <Button className="w-full">Log in to bid</Button>
            </Link>
          ) : auction.status === "live" && isOwner ? (
            <p className="text-sm text-muted-foreground">
              This is your listing. Bidders will use the panel above once you
              finish editing.
            </p>
          ) : null}

          {isEnded && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm">
              {auction.winner ? (
                <>
                  <p className="font-medium">
                    Winner: {auction.winner.name}
                    {isWinner ? " (you)" : ""}
                  </p>
                  {canPay && (
                    <p className="text-muted-foreground">
                      Complete payment to claim this lot.
                    </p>
                  )}
                  {alreadyPaid && (
                    <p className="text-primary">Payment completed.</p>
                  )}
                  {!user && (
                    <p className="text-muted-foreground">
                      Log in as the winner to pay.
                    </p>
                  )}
                  {user && !isWinner && !alreadyPaid && (
                    <p className="text-muted-foreground">
                      Only the winning bidder can check out.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  Auction ended with no sale
                  {auction.reservePrice
                    ? " (reserve price was not met)."
                    : " (no valid bids)."}
                </p>
              )}
            </div>
          )}

          {user && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={async () => {
                try {
                  await toggleWatch.mutateAsync(watching);
                  toastSuccess(
                    watching ? "Removed from watchlist" : "Added to watchlist"
                  );
                } catch (err) {
                  toastFromError(err, "Watchlist update failed");
                }
              }}
              disabled={toggleWatch.isPending}
            >
              {watching ? "Remove watchlist" : "Add to watchlist"}
            </Button>
          )}

          {canPay && (
            <Link href={`/checkout/${auction.id}`}>
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                Pay now
              </Button>
            </Link>
          )}

          {!user && isEnded && auction.winner && (
            <Link href="/auth/login">
              <Button className="w-full">Log in to pay</Button>
            </Link>
          )}

          {user &&
            ["ended", "sold"].includes(auction.status) &&
            (user.id === auction.winner?.id ||
              user.id === auction.seller?.id) && (
              <form
                className="space-y-2 border-t border-border pt-4"
                onSubmit={reviewForm.handleSubmit(
                  async (values) => {
                    try {
                      await submitReview.mutateAsync({
                        auctionId: auction.id,
                        rating: values.rating,
                        comment: values.comment,
                      });
                      toastSuccess("Review submitted");
                    } catch (err) {
                      const msg = toastFromError(err, "Review failed");
                      reviewForm.setError("root", { message: msg });
                    }
                  },
                  (formErrors) => toastValidationErrors(formErrors)
                )}
              >
                <p className="text-sm font-medium">Leave a rating</p>
                <Select
                  value={String(reviewForm.watch("rating") ?? 5)}
                  onValueChange={(value) =>
                    reviewForm.setValue("rating", Number(value ?? 5))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} stars
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Comment (optional)"
                  {...reviewForm.register("comment")}
                />
                {reviewForm.formState.errors.root && (
                  <p className="text-sm text-destructive">
                    {reviewForm.formState.errors.root.message}
                  </p>
                )}
                <Button
                  variant="ghost"
                  className="w-full"
                  type="submit"
                  disabled={submitReview.isPending}
                >
                  Submit review
                </Button>
              </form>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
