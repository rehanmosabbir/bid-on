import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { User } from "@/lib/api";
import { cn } from "@/lib/utils";

export function needsVerification(user: User | null | undefined) {
  if (!user || user.role === "admin") return false;
  return user.kycStatus !== "approved" || user.bankStatus !== "approved";
}

export function verificationLabel(status?: string | null) {
  switch (status) {
    case "approved":
      return "Approved";
    case "pending":
      return "Pending review";
    case "rejected":
      return "Rejected";
    default:
      return "Not submitted";
  }
}

export function VerificationRequired({ action }: { action: string }) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/40 px-4 py-4 text-sm">
      <p>
        Complete identity verification and bank details before {action}. An
        admin has to approve both.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href="/account/kyc" className={cn(buttonVariants({ size: "sm" }))}>
          Submit KYC
        </Link>
        <Link
          href="/account/bank"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          Bank details
        </Link>
      </div>
    </div>
  );
}
