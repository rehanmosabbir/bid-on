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
import { PasswordInput } from "@/components/PasswordInput";
import { useAuth } from "@/lib/auth";
import { loginSchema, LoginValues } from "@/lib/schemas";
import {
  toastError,
  toastFromError,
  toastSuccess,
  toastValidationErrors,
} from "@/lib/toast";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(
    async (values) => {
      try {
        const user = await login(values.email, values.password);
        toastSuccess(`Welcome back, ${user.name}`);
        router.push(user.role === "admin" ? "/admin" : "/dashboard");
      } catch (err) {
        const msg = toastFromError(err, "Login failed");
        if (msg.includes("not verified")) {
          toastError("Please verify your email first");
          router.push(`/auth/verify?email=${encodeURIComponent(values.email)}`);
        }
      }
    },
    (formErrors) => toastValidationErrors(formErrors)
  );

  return (
    <div className="relative mx-auto max-w-md px-4 py-20">
      <div className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      <Card className="relative">
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)] text-4xl">
            Log in
          </CardTitle>
          <CardDescription>Demo: buyer@bidon.local / Password1</CardDescription>
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
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" {...register("password")} />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Log in"}
            </Button>
            <p className="text-sm text-muted-foreground">
              No account?{" "}
              <Link href="/auth/register" className="text-primary underline-offset-4 hover:underline">
                Register
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
