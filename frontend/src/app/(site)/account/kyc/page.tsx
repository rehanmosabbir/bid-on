"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useMyKyc, useSubmitKyc } from "@/hooks/queries";
import { mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { kycSchema, KycValues } from "@/lib/schemas";
import { toastFromError, toastSuccess, toastValidationErrors } from "@/lib/toast";

const documentTypes = [
  { value: "nid", label: "National ID" },
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driving licence" },
];

function KycInner() {
  const refresh = useAuth((s) => s.refresh);
  const kycQ = useMyKyc();
  const submit = useSubmitKyc();
  const [file, setFile] = useState<File | null>(null);
  const kyc = kycQ.data?.kyc;

  const form = useForm<KycValues>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      fullName: "",
      documentType: "nid",
      documentNumber: "",
    },
  });

  useEffect(() => {
    if (!kyc) return;
    form.reset({
      fullName: kyc.fullName || "",
      documentType:
        kyc.documentType === "passport" || kyc.documentType === "driving_license"
          ? kyc.documentType
          : "nid",
      documentNumber: kyc.documentNumber || "",
    });
  }, [kyc, form]);

  const documentType = form.watch("documentType");
  const locked = kyc?.status === "pending" || kyc?.status === "approved";

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)] text-4xl">
            Identity verification
          </CardTitle>
          <CardDescription>
            Buyers and sellers need an approved KYC before bidding or listing.
          </CardDescription>
        </CardHeader>
        <form
          onSubmit={form.handleSubmit(
            async (values) => {
              try {
                const body = new FormData();
                body.append("fullName", values.fullName);
                body.append("documentType", values.documentType);
                body.append("documentNumber", values.documentNumber);
                if (file) body.append("document", file);
                await submit.mutateAsync(body);
                await refresh();
                toastSuccess("KYC submitted for admin review");
              } catch (err) {
                const msg = toastFromError(err, "KYC submission failed");
                form.setError("root", { message: msg });
              }
            },
            (errors) => toastValidationErrors(errors)
          )}
        >
          <CardContent className="space-y-4">
            <Badge variant="secondary">{verificationLabel(kyc?.status)}</Badge>
            {kyc?.rejectReason ? (
              <p className="text-sm text-destructive">{kyc.rejectReason}</p>
            ) : null}
            {kyc?.documentUrl ? (
              <a
                href={mediaUrl(kyc.documentUrl)}
                target="_blank"
                rel="noreferrer"
                className="block text-sm text-primary underline"
              >
                View submitted document
              </a>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" disabled={locked} {...form.register("fullName")} />
            </div>
            <div className="space-y-2">
              <Label>Document type</Label>
              <Select
                value={documentType}
                onValueChange={(value) =>
                  form.setValue(
                    "documentType",
                    (value ?? "nid") as KycValues["documentType"]
                  )
                }
                disabled={locked}
                items={Object.fromEntries(
                  documentTypes.map((item) => [item.value, item.label])
                )}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Document type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentNumber">Document number</Label>
              <Input
                id="documentNumber"
                disabled={locked}
                {...form.register("documentNumber")}
              />
            </div>
            {!locked ? (
              <div className="space-y-2">
                <Label htmlFor="document">Document image</Label>
                <Input
                  id="document"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {kyc?.status === "approved"
                  ? "Your identity is approved."
                  : "Waiting for an admin to review this submission."}
              </p>
            )}
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

export default function KycPage() {
  return (
    <RequirePermission authOnly>
      <KycInner />
    </RequirePermission>
  );
}
