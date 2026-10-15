"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RequirePermission } from "@/components/RequirePermission";
import { verificationLabel } from "@/components/VerificationRequired";
import { useMyBank, useSubmitBank } from "@/hooks/queries";
import { useAuth } from "@/lib/auth";
import { bankSchema, BankValues } from "@/lib/schemas";
import { toastFromError, toastSuccess, toastValidationErrors } from "@/lib/toast";

function BankInner() {
  const refresh = useAuth((s) => s.refresh);
  const bankQ = useMyBank();
  const submit = useSubmitBank();
  const bank = bankQ.data?.bank;
  const locked = bank?.status === "pending" || bank?.status === "approved";

  const form = useForm<BankValues>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      accountName: "",
      bankName: "",
      accountNumber: "",
      branch: "",
      routingNumber: "",
    },
  });

  useEffect(() => {
    if (!bank) return;
    form.reset({
      accountName: bank.accountName || "",
      bankName: bank.bankName || "",
      accountNumber: bank.accountNumber || "",
      branch: bank.branch || "",
      routingNumber: bank.routingNumber || "",
    });
  }, [bank, form]);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)] text-4xl">
            Bank details
          </CardTitle>
          <CardDescription>
            Used for payouts and refunds. An admin must approve them before you
            can bid or list.
          </CardDescription>
        </CardHeader>
        <form
          onSubmit={form.handleSubmit(
            async (values) => {
              try {
                await submit.mutateAsync(values);
                await refresh();
                toastSuccess("Bank details submitted for admin review");
              } catch (err) {
                const msg = toastFromError(err, "Could not save bank details");
                form.setError("root", { message: msg });
              }
            },
            (errors) => toastValidationErrors(errors)
          )}
        >
          <CardContent className="space-y-4">
            <Badge variant="secondary">{verificationLabel(bank?.status)}</Badge>
            {bank?.rejectReason ? (
              <p className="text-sm text-destructive">{bank.rejectReason}</p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="accountName">Account holder</Label>
              <Input id="accountName" disabled={locked} {...form.register("accountName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank name</Label>
              <Input id="bankName" disabled={locked} {...form.register("bankName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account number</Label>
              <Input
                id="accountNumber"
                disabled={locked}
                {...form.register("accountNumber")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Input id="branch" disabled={locked} {...form.register("branch")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routingNumber">Routing number</Label>
              <Input
                id="routingNumber"
                disabled={locked}
                {...form.register("routingNumber")}
              />
            </div>
            {locked ? (
              <p className="text-sm text-muted-foreground">
                {bank?.status === "approved"
                  ? "Your bank details are approved."
                  : "Waiting for an admin to review these details."}
              </p>
            ) : null}
            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
          </CardContent>
          <CardFooter className="gap-3">
            {!locked ? (
              <Button type="submit" disabled={submit.isPending}>
                {submit.isPending ? "Submitting…" : "Submit for review"}
              </Button>
            ) : null}
            <Link href="/account">
              <Button type="button" variant="ghost">
                Back to account
              </Button>
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function BankPage() {
  return (
    <RequirePermission authOnly>
      <BankInner />
    </RequirePermission>
  );
}
