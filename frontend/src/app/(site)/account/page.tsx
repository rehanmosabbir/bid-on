"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RequirePermission, useHasPermission } from "@/components/RequirePermission";
import { useUpdateProfile } from "@/hooks/queries";
import { useAuth } from "@/lib/auth";
import { profileSchema, ProfileValues } from "@/lib/schemas";
import { toastFromError, toastSuccess, toastValidationErrors } from "@/lib/toast";

function AccountInner() {
  const user = useAuth((s) => s.user)!;
  const setSession = useAuth((s) => s.setSession);
  const refresh = useAuth((s) => s.refresh);
  const updateProfile = useUpdateProfile();
  const canSwitchRole = useHasPermission("account:switch_role");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
  });

  const role = watch("role");

  useEffect(() => {
    reset({
      name: user.name,
      phone: user.phone || "",
      address: user.address || "",
      role: user.role === "admin" ? "seller" : user.role,
    });
  }, [user, reset]);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)] text-4xl">
            Account
          </CardTitle>
        </CardHeader>
        <form
          onSubmit={handleSubmit(
            async (values) => {
              try {
                const data = await updateProfile.mutateAsync(values);
                if (data.token) {
                  setSession(data.token, data.user);
                } else {
                  await refresh();
                }
                toastSuccess("Profile updated");
              } catch (err) {
                const msg = toastFromError(err, "Update failed");
                setError("root", { message: msg });
              }
            },
            (formErrors) => toastValidationErrors(formErrors)
          )}
        >
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="Phone" {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                placeholder="Address"
                {...register("address")}
              />
            </div>
            {canSwitchRole && (
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={role ?? "buyer"}
                  onValueChange={(value) =>
                    setValue("role", (value ?? "buyer") as "buyer" | "seller")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Buyer</SelectItem>
                    <SelectItem value="seller">Seller</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {errors.root && (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={isSubmitting || updateProfile.isPending}
            >
              Save changes
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function AccountPage() {
  return (
    <RequirePermission authOnly>
      <AccountInner />
    </RequirePermission>
  );
}
