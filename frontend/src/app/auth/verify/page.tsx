"use client";

import { Suspense } from "react";
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
import { verifySchema, VerifyValues } from "@/lib/schemas";
import { toastFromError, toastSuccess, toastValidationErrors } from "@/lib/toast";

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { setSession } = useAuth();
  const verifyMutation = useVerifyOtp();
  const resendMutation = useResendOtp();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<VerifyValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      email: params.get("email") || "",
      otp: params.get("otp") || "",
    },
  });

  const email = watch("email");

  const onSubmit = handleSubmit(
    async (values) => {
      try {
        const data = await verifyMutation.mutateAsync(values);
        setSession(data.token, data.user);
        toastSuccess("Email verified successfully");
        router.push("/dashboard");
      } catch (err) {
        const msg = toastFromError(err, "Verification failed");
        setError("root", { message: msg });
      }
    },
    (formErrors) => toastValidationErrors(formErrors)
  );

  async function resend() {
    try {
      const data = await resendMutation.mutateAsync(email);
      if (data.devOtp) setValue("otp", data.devOtp);
      toastSuccess("OTP resent");
    } catch (err) {
      const msg = toastFromError(err, "Resend failed");
      setError("root", { message: msg });
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)] text-4xl">
            Verify email
          </CardTitle>
          <CardDescription>
            Enter the 6-digit OTP sent to your email.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="otp">OTP</Label>
              <Input
                id="otp"
                maxLength={6}
                placeholder="6-digit code"
                {...register("otp")}
              />
              {errors.otp && (
                <p className="text-sm text-destructive">{errors.otp.message}</p>
              )}
            </div>
            {params.get("otp") && (
              <p className="text-sm text-accent">
                Dev OTP prefilled from registration.
              </p>
            )}
            {errors.root && (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || verifyMutation.isPending}
            >
              Verify
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={resend}
              disabled={resendMutation.isPending}
            >
              Resend OTP
            </Button>
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
