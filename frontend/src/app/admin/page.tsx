"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, Auction, formatBdt } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Stats = {
  users: number;
  auctions: number;
  live: number;
  pending: number;
  bids: number;
  revenue: number;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  suspended: boolean;
  verified: boolean;
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "pending" | "users" | "auctions">(
    "overview"
  );
  const [stats, setStats] = useState<Stats | null>(null);
  const [bidsByDay, setBidsByDay] = useState<Array<{ day: string; count: number }>>(
    []
  );
  const [pending, setPending] = useState<Auction[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [rejectReason, setRejectReason] = useState("Does not meet guidelines");

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  async function load() {
    const s = await api<{
      stats: Stats;
      bidsByDay: Array<{ day: string; count: number }>;
    }>("/api/admin/stats");
    setStats(s.stats);
    setBidsByDay(
      s.bidsByDay.map((b) => ({
        day: new Date(b.day).toLocaleDateString(),
        count: b.count,
      }))
    );
    const p = await api<{ auctions: Auction[] }>("/api/admin/auctions?status=pending");
    setPending(p.auctions);
    const u = await api<{ users: AdminUser[] }>("/api/admin/users");
    setUsers(u.users);
    const a = await api<{ auctions: Auction[] }>("/api/admin/auctions");
    setAuctions(a.auctions);
  }

  useEffect(() => {
    if (user?.role === "admin") load().catch(console.error);
  }, [user]);

  async function approve(id: string) {
    await api(`/api/auctions/${id}/approve`, { method: "POST" });
    await load();
  }

  async function reject(id: string) {
    await api(`/api/auctions/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason: rejectReason }),
    });
    await load();
  }

  async function toggleSuspend(id: string, suspended: boolean) {
    await api(`/api/admin/users/${id}/suspend`, {
      method: "PATCH",
      body: JSON.stringify({ suspended: !suspended }),
    });
    await load();
  }

  if (!user || user.role !== "admin") return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            Admin panel
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
            Operations
          </h1>
        </div>
        <a
          className="btn btn-ghost"
          href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/admin/reports/csv`}
          onClick={(e) => {
            e.preventDefault();
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
        </a>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {(
          [
            ["overview", "Overview"],
            ["pending", `Approvals (${pending.length})`],
            ["users", "Users"],
            ["auctions", "Auctions"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            className={`btn ${tab === key ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && stats && (
        <div className="mt-8 space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Users", stats.users],
              ["Auctions", stats.auctions],
              ["Live", stats.live],
              ["Pending", stats.pending],
              ["Bids", stats.bids],
              ["Revenue", formatBdt(stats.revenue)],
            ].map(([label, value]) => (
              <div key={String(label)} className="panel p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  {label}
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-3xl">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <div className="panel h-72 p-4">
            <p className="mb-4 text-sm text-[var(--muted)]">Bids · last 14 days</p>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={bidsByDay}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0f6e56" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === "pending" && (
        <div className="mt-8 space-y-4">
          <input
            className="field max-w-md"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reject reason"
          />
          {pending.length === 0 && (
            <p className="text-[var(--muted)]">No pending listings.</p>
          )}
          {pending.map((a) => (
            <div key={a.id} className="panel flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <Link href={`/auctions/${a.id}`} className="text-lg font-medium">
                  {a.title}
                </Link>
                <p className="text-sm text-[var(--muted)]">
                  {formatBdt(a.startPrice)} · {(a as Auction & { seller?: { name: string } }).seller?.name}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-accent" onClick={() => approve(a.id)}>
                  Approve
                </button>
                <button className="btn btn-ghost" onClick={() => reject(a.id)}>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="mt-8 panel divide-y divide-[var(--line)]">
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">
                  {u.name}{" "}
                  <span className="text-xs uppercase text-[var(--muted)]">
                    {u.role}
                  </span>
                </p>
                <p className="text-sm text-[var(--muted)]">{u.email}</p>
              </div>
              <button
                className="btn btn-ghost"
                onClick={() => toggleSuspend(u.id, u.suspended)}
              >
                {u.suspended ? "Unsuspend" : "Suspend"}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "auctions" && (
        <div className="mt-8 panel divide-y divide-[var(--line)]">
          {auctions.map((a) => (
            <Link
              key={a.id}
              href={`/auctions/${a.id}`}
              className="flex justify-between gap-4 p-4 hover:bg-[var(--surface-2)]/40"
            >
              <span>
                {a.title}{" "}
                <span className="text-xs uppercase text-[var(--muted)]">
                  {a.status}
                </span>
              </span>
              <span>{formatBdt(a.currentBid || a.startPrice)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
