"use client";

import { useState } from "react";
import {
  Escrow,
  useConfirmEscrow,
  useDisputeEscrow,
  useShipEscrow,
} from "@/hooks/queries";
import { formatBdt } from "@/lib/api";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const labels: Record<string, string> = {
  pending: "Checkout started",
  held: "Held in escrow",
  disputed: "Disputed",
  completed: "Released to seller",
  failed: "Failed",
  refunded: "Refunded",
};

export function escrowLabel(status: string) {
  return labels[status] || status;
}

export function EscrowPanel({
  escrow,
  userId,
}: {
  escrow: Escrow;
  userId?: string;
}) {
  const ship = useShipEscrow();
  const confirm = useConfirmEscrow();
  const dispute = useDisputeEscrow();
  const [reason, setReason] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const isBuyer = userId === escrow.buyerId;
  const isSeller = userId === escrow.sellerId;
  const busy = ship.isPending || confirm.isPending || dispute.isPending;
  const releaseOn = escrow.releaseDueAt
    ? new Date(escrow.releaseDueAt).toLocaleString()
    : null;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">Escrow</p>
        <Badge variant="secondary">{escrowLabel(escrow.status)}</Badge>
      </div>
      <p>{formatBdt(escrow.amount)} is handled by Bid On, not paid straight to the seller.</p>
      {escrow.status === "held" && !escrow.shippedAt && (
        <p className="text-muted-foreground">
          The seller has not marked this as shipped. You can release the funds
          once you have the item, or open a dispute if it does not arrive.
        </p>
      )}
      {escrow.status === "held" && escrow.shippedAt && releaseOn && (
        <p className="text-muted-foreground">
          Shipped. If you do nothing, funds release on {releaseOn}.
        </p>
      )}
      {escrow.status === "disputed" && (
        <p className="text-muted-foreground">
          Dispute: {escrow.disputeReason} An admin will release the funds or
          refund you.
        </p>
      )}
      {escrow.status === "completed" && (
        <p className="text-muted-foreground">
          Released to the seller&apos;s verified bank account.
          {escrow.resolveNote ? ` ${escrow.resolveNote}` : ""}
        </p>
      )}
      {escrow.status === "refunded" && (
        <p className="text-muted-foreground">
          Refunded to the buyer.
          {escrow.resolveNote ? ` ${escrow.resolveNote}` : ""}
        </p>
      )}
      {isSeller && escrow.status === "held" && !escrow.shippedAt && (
        <Button
          className="w-full"
          disabled={busy}
          onClick={async () => {
            try {
              await ship.mutateAsync({ id: escrow.id });
              toastSuccess("Marked as shipped");
            } catch (err) {
              toastFromError(err, "Could not update shipment");
            }
          }}
        >
          Mark as shipped
        </Button>
      )}
      {isBuyer && escrow.status === "held" && (
        <>
          <Button
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={busy}
            onClick={async () => {
              try {
                await confirm.mutateAsync({ id: escrow.id });
                toastSuccess("Receipt confirmed. Funds released.");
              } catch (err) {
                toastFromError(err, "Could not release escrow");
              }
            }}
          >
            Confirm receipt and release funds
          </Button>
          {showDispute ? (
            <div className="space-y-2">
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="What went wrong? At least 10 characters."
              />
              <Button
                variant="ghost"
                className="w-full"
                disabled={busy}
                onClick={async () => {
                  try {
                    await dispute.mutateAsync({
                      id: escrow.id,
                      body: { reason },
                    });
                    toastSuccess("Dispute opened");
                    setShowDispute(false);
                  } catch (err) {
                    toastFromError(err, "Could not open dispute");
                  }
                }}
              >
                Submit dispute
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowDispute(true)}
            >
              Open a dispute
            </Button>
          )}
        </>
      )}
    </div>
  );
}
