"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAdminStats } from "@/hooks/queries";
import { formatBdt } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminOverviewPage() {
  const statsQ = useAdminStats(true);
  const stats = statsQ.data?.stats;
  const bidsByDay = (statsQ.data?.bidsByDay || []).map((b) => ({
    day: new Date(b.day).toLocaleDateString(),
    count: b.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform KPIs and recent bidding activity.
        </p>
      </div>

      {stats ? (
        <div className="space-y-6">
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
                  <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
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
      ) : (
        <p className="text-sm text-muted-foreground">Loading stats…</p>
      )}
    </div>
  );
}
