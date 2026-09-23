"use client";

import { Suspense } from "react";
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
import { PasswordInput } from "@/components/PasswordInput";
import { useResetPassword } from "@/hooks/queries";
import { resetPasswordSchema, ResetPasswordValues } from "@/lib/schemas";
import { toastFromError, toastSuccess, toastValidationErrors } from "@/lib/toast";

function ResetInner() {
  const params = useSearchParams();
  const router = useRouter();
  const reset = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: params.get("email") || "",
      otp: params.get("otp") || "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit(
    async (values) => {
      try {
        const data = await reset.mutateAsync({
          email: values.email,
          otp: values.otp,
          password: values.password,
        });
        toastSuccess(data.message);
        router.push("/auth/login");
      } catch (err) {
        const msg = toastFromError(err, "Reset failed");
        setError("root", { message: msg });
      }
    },
    (formErrors) => toastValidationErrors(formErrors)
  );

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)] text-4xl">
            Reset password
          </CardTitle>
          <CardDescription>
            Enter the code from your email and choose a new password.
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
              <Label htmlFor="otp">Reset code</Label>
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
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <PasswordInput id="password" {...register("password")} />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <PasswordInput
                id="confirmPassword"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
            {params.get("otp") && (
              <p className="text-sm text-accent">
                Dev OTP prefilled (SMTP not configured).
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
              disabled={isSubmitting || reset.isPending}
            >
              {reset.isPending ? "Updating…" : "Update password"}
            </Button>
            <p className="text-sm text-muted-foreground">
              <Link
                href="/auth/forgot"
                className="text-primary underline-offset-4 hover:underline"
              >
                Request a new code
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetInner />
    </Suspense>
  );
}
