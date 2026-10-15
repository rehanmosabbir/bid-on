"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminUsers, useSuspendUser } from "@/hooks/queries";
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

const roles = [
  { value: "all", label: "All roles" },
  { value: "buyer", label: "Buyers" },
  { value: "seller", label: "Sellers" },
  { value: "admin", label: "Admins" },
];

export default function AdminUsersPage() {
  const [role, setRole] = useState("all");
  const [q, setQ] = useState("");
  const usersQ = useAdminUsers(true, { role, q: q.trim() });
  const suspend = useSuspendUser();
  const users = usersQ.data?.users || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter by role or search by name and email.
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

      {usersQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading users…</p>
      ) : usersQ.isError ? (
        <p className="text-sm text-destructive">
          {usersQ.error instanceof Error
            ? usersQ.error.message
            : "Could not load users"}
        </p>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users match these filters.</p>
      ) : (
        <Card className="py-0">
          <CardContent className="divide-y divide-border p-0">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-medium">
                    {u.name}{" "}
                    <Badge variant="secondary" className="uppercase">
                      {u.role}
                    </Badge>
                    {u.suspended ? (
                      <Badge variant="destructive" className="ml-1">
                        Suspended
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                  {u.role !== "admin" ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      KYC {verificationLabel(u.kycStatus)} · Bank{" "}
                      {verificationLabel(u.bankStatus)}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {u.role !== "admin" ? (
                    <Link href="/admin/verifications">
                      <Button variant="outline" size="sm">
                        Verification
                      </Button>
                    </Link>
                  ) : null}
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await suspend.mutateAsync({
                          id: u.id,
                          suspended: !u.suspended,
                        });
                        toastSuccess(
                          u.suspended
                            ? `${u.name} unsuspended`
                            : `${u.name} suspended`
                        );
                      } catch (err) {
                        toastFromError(err, "User update failed");
                      }
                    }}
                  >
                    {u.suspended ? "Unsuspend" : "Suspend"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
