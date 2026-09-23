"use client";

import { useAdminUsers, useSuspendUser } from "@/hooks/queries";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminUsersPage() {
  const usersQ = useAdminUsers(true);
  const suspend = useSuspendUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage accounts and suspend or unsuspend users.
        </p>
      </div>

      <Card className="py-0">
        <CardContent className="divide-y divide-border p-0">
          {(usersQ.data?.users || []).map((u) => (
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
                </p>
                <p className="text-sm text-muted-foreground">{u.email}</p>
              </div>
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
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
