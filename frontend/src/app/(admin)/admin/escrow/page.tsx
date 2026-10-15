"use client";

import { useState } from "react";
import Link from "next/link";
import { Escrow, useAdminEscrow, useResolveEscrow } from "@/hooks/queries";
import { formatBdt } from "@/lib/api";
import { escrowLabel } from "@/components/EscrowPanel";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const filters = [
  { value: "open", label: "Held and disputed" },
  { value: "disputed", label: "Disputed" },
  { value: "held", label: "Held" },
  { value: "completed", label: "Released" },
  { value: "refunded", label: "Refunded" },
  { value: "all", label: "All" },
];

function ResolveRow({ escrow }: { escrow: Escrow }) {
  const resolve = useResolveEscrow();
  const [note, setNote] = useState("");
  const open = escrow.status === "held" || escrow.status === "disputed";

  return (
    <div className="space-y-3 border-b border-border p-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/auctions/${escrow.auctionId}`}
            className="font-medium hover:underline"
          >
            {escrow.auction?.title || escrow.auctionId}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatBdt(escrow.amount)} · Buyer {escrow.buyer?.name} · Seller{" "}
            {escrow.seller?.name}
            {escrow.seller?.bankName
              ? ` · ${escrow.seller.bankName} (${escrow.seller.bankStatus})`
              : ""}
          </p>
          {escrow.shippedAt ? (
            <p className="text-sm text-muted-foreground">
              Shipped {new Date(escrow.shippedAt).toLocaleString()}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Not shipped</p>
          )}
          {escrow.disputeReason ? (
            <p className="mt-1 text-sm">Dispute: {escrow.disputeReason}</p>
          ) : null}
          {escrow.resolveNote ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {escrow.resolveNote}
            </p>
          ) : null}
        </div>
        <Badge variant="secondary">{escrowLabel(escrow.status)}</Badge>
      </div>
      {open ? (
        <div className="flex max-w-xl flex-col gap-2 sm:flex-row">
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Resolution note (required to refund)"
          />
          <Button
            disabled={resolve.isPending}
            onClick={async () => {
              try {
                await resolve.mutateAsync({
                  id: escrow.id,
                  decision: "release",
                  note,
                });
                toastSuccess("Funds released to the seller");
              } catch (err) {
                toastFromError(err, "Could not release escrow");
              }
            }}
          >
            Release
          </Button>
          <Button
            variant="ghost"
            disabled={resolve.isPending}
            onClick={async () => {
              try {
                await resolve.mutateAsync({
                  id: escrow.id,
                  decision: "refund",
                  note,
                });
                toastSuccess("Payment refunded");
              } catch (err) {
                toastFromError(err, "Could not refund");
              }
            }}
          >
            Refund
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminEscrowPage() {
  const [status, setStatus] = useState("open");
  const query = useAdminEscrow(status, true);
  const rows = query.data?.escrows || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Escrow</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Held payments, disputes, and payouts to verified seller bank accounts.
          </p>
        </div>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value || "open")}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {filters.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border border-border bg-card">
        {query.isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No escrow records.</p>
        ) : (
          rows.map((escrow) => <ResolveRow key={escrow.id} escrow={escrow} />)
        )}
      </div>
    </div>
  );
}
