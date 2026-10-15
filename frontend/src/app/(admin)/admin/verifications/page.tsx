"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  AdminUser,
  useAdminVerifications,
  useReviewBank,
  useReviewKyc,
} from "@/hooks/queries";
import { mediaUrl } from "@/lib/api";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { verificationLabel } from "@/components/VerificationRequired";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const roles = [
  { value: "all", label: "Buyers and sellers" },
  { value: "buyer", label: "Buyers" },
  { value: "seller", label: "Sellers" },
];

const statuses = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "none", label: "Not submitted" },
  { value: "all", label: "All" },
];

const documentLabels: Record<string, string> = {
  nid: "National ID",
  passport: "Passport",
  driving_license: "Driving licence",
};

function ReviewActions({
  pending,
  busy,
  onApprove,
  onReject,
}: {
  pending: boolean;
  busy: boolean;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const form = useForm({ defaultValues: { reason: "" } });
  if (!pending) return null;
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <Input placeholder="Rejection reason" {...form.register("reason")} />
      <div className="flex gap-2">
        <Button onClick={onApprove} disabled={busy}>
          Approve
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => onReject(form.getValues("reason"))}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}

function KycRow({ user }: { user: AdminUser }) {
  const review = useReviewKyc();
  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-4 pt-6">
        <div className="space-y-1 text-sm">
          <p className="font-medium">
            {user.name}{" "}
            <Badge variant="secondary" className="uppercase">
              {user.role}
            </Badge>{" "}
            <Badge variant="outline">{verificationLabel(user.kycStatus)}</Badge>
          </p>
          <p className="text-muted-foreground">{user.email}</p>
          <p>
            {user.kycFullName || "—"} ·{" "}
            {documentLabels[user.kycDocumentType || ""] || user.kycDocumentType || "No document"}{" "}
            · {user.kycDocumentNumber || "—"}
          </p>
          {user.kycDocumentUrl ? (
            <a
              href={mediaUrl(user.kycDocumentUrl)}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              View document
            </a>
          ) : null}
          {user.kycRejectReason ? (
            <p className="text-destructive">Rejected: {user.kycRejectReason}</p>
          ) : null}
        </div>
        <ReviewActions
          pending={user.kycStatus === "pending"}
          busy={review.isPending}
          onApprove={async () => {
            try {
              await review.mutateAsync({ id: user.id, decision: "approved" });
              toastSuccess(`Approved KYC for ${user.name}`);
            } catch (err) {
              toastFromError(err, "KYC review failed");
            }
          }}
          onReject={async (reason) => {
            try {
              await review.mutateAsync({
                id: user.id,
                decision: "rejected",
                reason,
              });
              toastSuccess(`Rejected KYC for ${user.name}`);
            } catch (err) {
              toastFromError(err, "KYC review failed");
            }
          }}
        />
      </CardContent>
    </Card>
  );
}

function BankRow({ user }: { user: AdminUser }) {
  const review = useReviewBank();
  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-4 pt-6">
        <div className="space-y-1 text-sm">
          <p className="font-medium">
            {user.name}{" "}
            <Badge variant="secondary" className="uppercase">
              {user.role}
            </Badge>{" "}
            <Badge variant="outline">{verificationLabel(user.bankStatus)}</Badge>
          </p>
          <p className="text-muted-foreground">{user.email}</p>
          <p>
            {user.bankAccountName || "—"} · {user.bankName || "—"} ·{" "}
            {user.bankAccountNumber || "—"}
          </p>
          <p className="text-muted-foreground">
            {user.bankBranch || "No branch"}
            {user.bankRoutingNumber ? ` · Routing ${user.bankRoutingNumber}` : ""}
          </p>
          {user.bankRejectReason ? (
            <p className="text-destructive">Rejected: {user.bankRejectReason}</p>
          ) : null}
        </div>
        <ReviewActions
          pending={user.bankStatus === "pending"}
          busy={review.isPending}
          onApprove={async () => {
            try {
              await review.mutateAsync({ id: user.id, decision: "approved" });
              toastSuccess(`Approved bank details for ${user.name}`);
            } catch (err) {
              toastFromError(err, "Bank review failed");
            }
          }}
          onReject={async (reason) => {
            try {
              await review.mutateAsync({
                id: user.id,
                decision: "rejected",
                reason,
              });
              toastSuccess(`Rejected bank details for ${user.name}`);
            } catch (err) {
              toastFromError(err, "Bank review failed");
            }
          }}
        />
      </CardContent>
    </Card>
  );
}

export default function AdminVerificationsPage() {
  const [role, setRole] = useState("all");
  const [q, setQ] = useState("");
  const [kycStatus, setKycStatus] = useState("pending");
  const [bankStatus, setBankStatus] = useState("pending");
  const kycQ = useAdminVerifications({ role, q: q.trim(), kycStatus });
  const bankQ = useAdminVerifications({ role, q: q.trim(), bankStatus });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve or reject buyer and seller identity documents and bank
          details.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search name or email"
        />
        <Select
          value={role}
          onValueChange={(value) => setRole(value ?? "all")}
          items={Object.fromEntries(roles.map((item) => [item.value, item.label]))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="kyc">
        <TabsList>
          <TabsTrigger value="kyc">KYC</TabsTrigger>
          <TabsTrigger value="bank">Bank details</TabsTrigger>
        </TabsList>

        <TabsContent value="kyc" className="space-y-3">
          <Select
            value={kycStatus}
            onValueChange={(value) => setKycStatus(value ?? "pending")}
            items={Object.fromEntries(statuses.map((item) => [item.value, item.label]))}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="KYC status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(kycQ.data?.users || []).map((user) => (
            <KycRow key={user.id} user={user} />
          ))}
          {kycQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading KYC submissions…</p>
          ) : (kycQ.data?.users || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No KYC records match.</p>
          ) : null}
        </TabsContent>

        <TabsContent value="bank" className="space-y-3">
          <Select
            value={bankStatus}
            onValueChange={(value) => setBankStatus(value ?? "pending")}
            items={Object.fromEntries(statuses.map((item) => [item.value, item.label]))}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Bank status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(bankQ.data?.users || []).map((user) => (
            <BankRow key={user.id} user={user} />
          ))}
          {bankQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading bank details…</p>
          ) : (bankQ.data?.users || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No bank records match.</p>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
