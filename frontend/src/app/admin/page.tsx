"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useAdminAuctions,
  useAdminStats,
  useAdminUsers,
  useApproveAuction,
  useRejectAuction,
  useSuspendUser,
} from "@/hooks/queries";
import { Auction, formatBdt } from "@/lib/api";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { RequirePermission } from "@/components/RequirePermission";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function AdminInner() {
  const statsQ = useAdminStats(true);
  const pendingQ = useAdminAuctions("pending", true);
  const usersQ = useAdminUsers(true);
  const auctionsQ = useAdminAuctions(undefined, true);
  const approve = useApproveAuction();
  const reject = useRejectAuction();
  const suspend = useSuspendUser();

  const rejectForm = useForm({
    defaultValues: { reason: "Does not meet guidelines" },
  });

  const stats = statsQ.data?.stats;
  const bidsByDay = (statsQ.data?.bidsByDay || []).map((b) => ({
    day: new Date(b.day).toLocaleDateString(),
    count: b.count,
  }));
  const pending = pendingQ.data?.auctions || [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Admin panel
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
            Operations
          </h1>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            const token = localStorage.getItem("token");
            fetch(
              `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/admin/reports/csv`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
              .then((r) => r.text())
              .then((csv) => {
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "auctions-report.csv";
                a.click();
              });
          }}
        >
          Export CSV
        </Button>
      </div>

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pending">
            Approvals ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="auctions">Auctions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {stats && (
            <div className="space-y-8">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Users", stats.users],
                  ["Auctions", stats.auctions],
                  ["Live", stats.live],
                  ["Pending", stats.pending],
                  ["Bids", stats.bids],
                  ["Revenue", formatBdt(stats.revenue)],
                ].map(([label, value]) => (
                  <Card key={String(label)}>
                    <CardHeader className="pb-2">
                      <CardDescription className="uppercase tracking-[0.16em]">
                        {label}
                      </CardDescription>
                      <CardTitle className="font-[family-name:var(--font-display)] text-3xl">
                        {value}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              <Card className="h-72">
                <CardHeader>
                  <CardDescription>Bids · last 14 days</CardDescription>
                </CardHeader>
                <CardContent className="h-[85%]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bidsByDay}>
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill="var(--primary)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-6 space-y-4">
          <Input
            className="max-w-md"
            {...rejectForm.register("reason")}
            placeholder="Reject reason"
          />
          {pending.length === 0 && (
            <p className="text-muted-foreground">No pending listings.</p>
          )}
          {pending.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                <div>
                  <Link
                    href={`/auctions/${a.id}`}
                    className="text-lg font-medium hover:underline"
                  >
                    {a.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {formatBdt(a.startPrice)} ·{" "}
                    {(a as Auction & { seller?: { name: string } }).seller?.name}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={async () => {
                      try {
                        await approve.mutateAsync(a.id);
                        toastSuccess(`Approved “${a.title}”`);
                      } catch (err) {
                        toastFromError(err, "Approve failed");
                      }
                    }}
                    disabled={approve.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await reject.mutateAsync({
                          id: a.id,
                          reason: rejectForm.getValues("reason"),
                        });
                        toastSuccess(`Rejected “${a.title}”`);
                      } catch (err) {
                        toastFromError(err, "Reject failed");
                      }
                    }}
                    disabled={reject.isPending}
                  >
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="users" className="mt-6">
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
        </TabsContent>

        <TabsContent value="auctions" className="mt-6">
          <Card className="py-0">
            <CardContent className="divide-y divide-border p-0">
              {(auctionsQ.data?.auctions || []).map((a) => (
                <Link
                  key={a.id}
                  href={`/auctions/${a.id}`}
                  className="flex justify-between gap-4 p-4 hover:bg-muted/50"
                >
                  <span className="flex items-center gap-2">
                    {a.title}
                    <Badge variant="secondary" className="uppercase">
                      {a.status}
                    </Badge>
                  </span>
                  <span>{formatBdt(a.currentBid || a.startPrice)}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequirePermission permission="admin:access">
      <AdminInner />
    </RequirePermission>
  );
}
