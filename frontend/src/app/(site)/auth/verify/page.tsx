"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useAuth } from "@/lib/auth";
import { useResendOtp, useVerifyOtp } from "@/hooks/queries";
import { resendVerifySchema, ResendVerifyValues } from "@/lib/schemas";
import { toastFromError, toastSuccess, toastValidationErrors } from "@/lib/toast";

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { setSession } = useAuth();
  const verifyMutation = useVerifyOtp();
  const resendMutation = useResendOtp();
  const token = params.get("token") || "";
  const [status, setStatus] = useState<"idle" | "verifying" | "error">(
    token ? "verifying" : "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [devLink, setDevLink] = useState<string | null>(null);
  const tried = useRef(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("bidon-verify-url");
    if (stored) {
      setDevLink(stored);
      sessionStorage.removeItem("bidon-verify-url");
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ResendVerifyValues>({
    resolver: zodResolver(resendVerifySchema),
    defaultValues: { email: params.get("email") || "" },
  });

  useEffect(() => {
    if (!token || tried.current) return;
    tried.current = true;

    (async () => {
      try {
        const data = await verifyMutation.mutateAsync({ token });
        setSession(data.token, data.user);
        toastSuccess("Email verified successfully");
        router.replace("/dashboard");
      } catch (err) {
        const msg = toastFromError(err, "Verification failed");
        setErrorMsg(msg);
        setStatus("error");
      }
    })();
    // Intentionally run once when token is present
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onResend = handleSubmit(
    async (values) => {
      try {
        const data = await resendMutation.mutateAsync(values.email);
        toastSuccess(data.message);
        if (data.verifyUrl) setDevLink(data.verifyUrl);
      } catch (err) {
        const msg = toastFromError(err, "Resend failed");
        setError("root", { message: msg });
      }
    },
    (formErrors) => toastValidationErrors(formErrors)
  );

  if (token && status === "verifying") {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-display)] text-4xl">
              Verifying…
            </CardTitle>
            <CardDescription>
              Confirming your email. This only takes a moment.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (token && status === "error") {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-display)] text-4xl">
              Link invalid
            </CardTitle>
            <CardDescription>
              {errorMsg || "This verification link is invalid or expired."}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/auth/verify" className="w-full">
              <Button className="w-full" variant="outline">
                Request a new link
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)] text-4xl">
            Check your email
          </CardTitle>
          <CardDescription>
            We sent a verification link to your inbox. Open it to activate your
            account. If it didn&apos;t arrive, request a new one below.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onResend}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            {errors.root && (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            )}
            {devLink && (
              <p className="break-all text-sm text-accent">
                Dev link (email blocked):{" "}
                <a href={devLink} className="underline">
                  {devLink}
                </a>
              </p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              disabled={resendMutation.isPending}
            >
              {resendMutation.isPending
                ? "Sending…"
                : "Resend verification email"}
            </Button>
            <p className="text-sm text-muted-foreground">
              <Link
                href="/auth/login"
                className="text-primary underline-offset-4 hover:underline"
              >
                Back to log in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyInner />
    </Suspense>
  );
}
