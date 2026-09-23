"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateAuction } from "@/hooks/queries";
import { Auction } from "@/lib/api";
import { sellerEditSchema, SellerEditValues } from "@/lib/schemas";
import { toastFromError, toastSuccess, toastValidationErrors } from "@/lib/toast";

function remainingMinutes(endsAt: string) {
  const ms = new Date(endsAt).getTime() - Date.now();
  return Math.max(1, Math.ceil(ms / 60000));
}

export function SellerEditPanel({ auction }: { auction: Auction }) {
  const updateAuction = useUpdateAuction(auction.id);
  const form = useForm<SellerEditValues>({
    resolver: zodResolver(sellerEditSchema),
    defaultValues: {
      startPrice: Number(auction.startPrice) || 0,
      durationMinutes: remainingMinutes(auction.endsAt),
    },
  });

  useEffect(() => {
    form.reset({
      startPrice: Number(auction.startPrice) || 0,
      durationMinutes: remainingMinutes(auction.endsAt),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when auction values change
  }, [auction.id, auction.startPrice, auction.endsAt]);

  return (
    <form
      className="space-y-3 border-t border-border pt-4"
      onSubmit={form.handleSubmit(
        async (values) => {
          try {
            await updateAuction.mutateAsync(values);
            toastSuccess("Listing updated");
          } catch (err) {
            const msg = toastFromError(err, "Update failed");
            form.setError("root", { message: msg });
          }
        },
        (errors) => toastValidationErrors(errors)
      )}
    >
      <p className="text-sm font-medium">Edit listing</p>
      <p className="text-xs text-muted-foreground">
        Change the opening bid and how long the auction runs. Locked once
        someone bids.
      </p>
      <div className="space-y-2">
        <Label htmlFor="edit-startPrice">Start price (BDT)</Label>
        <Input
          id="edit-startPrice"
          type="number"
          min={1}
          {...form.register("startPrice")}
        />
        {form.formState.errors.startPrice && (
          <p className="text-sm text-destructive">
            {form.formState.errors.startPrice.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-duration">Duration (minutes from now)</Label>
        <Input
          id="edit-duration"
          type="number"
          min={1}
          max={43200}
          {...form.register("durationMinutes")}
        />
        {form.formState.errors.durationMinutes && (
          <p className="text-sm text-destructive">
            {form.formState.errors.durationMinutes.message}
          </p>
        )}
      </div>
      {form.formState.errors.root && (
        <p className="text-sm text-destructive">
          {form.formState.errors.root.message}
        </p>
      )}
      <Button
        type="submit"
        variant="outline"
        className="w-full"
        disabled={updateAuction.isPending}
      >
        {updateAuction.isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
