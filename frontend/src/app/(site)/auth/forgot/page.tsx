"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useForgotPassword } from "@/hooks/queries";
import { forgotPasswordSchema, ForgotPasswordValues } from "@/lib/schemas";
import { toastFromError, toastSuccess, toastValidationErrors } from "@/lib/toast";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const forgot = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(
    async (values) => {
      try {
        const data = await forgot.mutateAsync(values.email);
        toastSuccess(data.message);
        const qs = new URLSearchParams({ email: data.email });
        if (data.devOtp) qs.set("otp", data.devOtp);
        router.push(`/auth/reset?${qs.toString()}`);
      } catch (err) {
        const msg = toastFromError(err, "Request failed");
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
            Forgot password
          </CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send a 6-digit reset code.
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
            {errors.root && (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || forgot.isPending}
            >
              {forgot.isPending ? "Sending…" : "Send reset code"}
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
