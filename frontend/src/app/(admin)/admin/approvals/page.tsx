"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import {
  useAdminAuctions,
  useApproveAuction,
  useRejectAuction,
} from "@/hooks/queries";
import { Auction, formatBdt } from "@/lib/api";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminApprovalsPage() {
  const pendingQ = useAdminAuctions("pending", true);
  const approve = useApproveAuction();
  const reject = useRejectAuction();
  const rejectForm = useForm({
    defaultValues: { reason: "Does not meet guidelines" },
  });
  const pending = pendingQ.data?.auctions || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and approve or reject pending listings.
        </p>
      </div>

      <Input
        className="max-w-md"
        {...rejectForm.register("reason")}
        placeholder="Reject reason"
      />

      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending listings.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                <div>
                  <Link
                    href={`/auctions/${a.id}`}
                    className="text-lg font-medium hover:underline"
                  >
                    {a.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {formatBdt(a.startPrice)} ·{" "}
                    {(a as Auction & { seller?: { name: string } }).seller?.name}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={async () => {
                      try {
                        await approve.mutateAsync(a.id);
                        toastSuccess(`Approved “${a.title}”`);
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
                          id: a.id,
                          reason: rejectForm.getValues("reason"),
                        });
                        toastSuccess(`Rejected “${a.title}”`);
                      } catch (err) {
                        toastFromError(err, "Reject failed");
                      }
                    }}
                    disabled={reject.isPending}
                  >
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
