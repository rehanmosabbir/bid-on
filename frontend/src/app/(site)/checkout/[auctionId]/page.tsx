"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuction, useCheckout } from "@/hooks/queries";
import { api, formatBdt } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toastError, toastFromError, toastInfo, toastSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RequirePermission } from "@/components/RequirePermission";

function CheckoutInner() {
  const { auctionId } = useParams<{ auctionId: string }>();
  const search = useSearchParams();
  const user = useAuth((s) => s.user);
  const { data, isLoading, refetch } = useAuction(auctionId);
  const checkout = useCheckout();
  const successFlag = search.get("success") === "1";
  const canceled = search.get("canceled") === "1";
  const sessionId = search.get("session_id");
  const [paid, setPaid] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (canceled) toastError("Payment canceled");
  }, [canceled]);

  useEffect(() => {
    if (!successFlag) return;
    let cancelled = false;

    async function confirm() {
      setConfirming(true);
      try {
        if (sessionId) {
          const result = await api<{
            status?: string;
            payment_status?: string;
          }>(
            `/api/payments/session-status?session_id=${encodeURIComponent(sessionId)}`
          );
          if (
            !cancelled &&
            (result.status === "complete" || result.payment_status === "paid")
          ) {
            setPaid(true);
            toastSuccess("Payment successful");
            await refetch();
            return;
          }
        }
        if (!cancelled) {
          setPaid(true);
          toastSuccess("Payment successful");
          await refetch();
        }
      } catch (err) {
        if (!cancelled) toastFromError(err, "Could not confirm payment");
      } finally {
        if (!cancelled) setConfirming(false);
      }
    }

    void confirm();
    return () => {
      cancelled = true;
    };
  }, [successFlag, sessionId, refetch]);

  const auction = data?.auction;
  const alreadySold = auction?.status === "sold";

  if (isLoading || !auction) {
    return <p className="p-10 text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)] text-4xl">
            Checkout
          </CardTitle>
          <CardDescription>{auction.title}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">Amount due</p>
          <p className="font-[family-name:var(--font-display)] text-3xl text-accent">
            {formatBdt(auction.currentBid)}
          </p>
          {canceled && (
            <p className="text-sm text-destructive">
              Checkout was canceled. You can try again.
            </p>
          )}
          {(paid || alreadySold) && (
            <p className="text-sm text-accent">
              {confirming ? "Confirming payment…" : "Payment successful."}
            </p>
          )}
          {user?.id === auction.winner?.id && !paid && !alreadySold ? (
            <Button
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={checkout.isPending}
              onClick={async () => {
                try {
                  const result = await checkout.mutateAsync(auctionId);
                  if (result.url) {
                    toastInfo("Redirecting to Stripe Checkout…");
                    window.location.href = result.url;
                  } else {
                    toastSuccess(result.message || "Payment completed");
                    setPaid(true);
                    await refetch();
                  }
                } catch (err) {
                  toastFromError(err, "Payment failed");
                }
              }}
            >
              {checkout.isPending ? "Processing…" : "Pay with Stripe (test)"}
            </Button>
          ) : user?.id !== auction.winner?.id ? (
            <p className="text-sm text-destructive">
              Only the auction winner can pay.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <RequirePermission authOnly>
      <Suspense>
        <CheckoutInner />
      </Suspense>
    </RequirePermission>
  );
}
