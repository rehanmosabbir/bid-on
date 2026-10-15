"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useAdminAuctions,
  useAdminUsers,
  useCategories,
} from "@/hooks/queries";
import { formatBdt } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statuses = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "live", label: "Live" },
  { value: "ended", label: "Ended" },
  { value: "sold", label: "Sold" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminAuctionsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sellerId, setSellerId] = useState("all");
  const [categoryId, setCategoryId] = useState("all");

  const auctionsQ = useAdminAuctions(
    { status, sellerId, categoryId, q: q.trim() },
    true
  );
  const usersQ = useAdminUsers(true);
  const categoriesQ = useCategories();
  const sellers = (usersQ.data?.users || []).filter((user) => user.role !== "buyer");
  const categories = categoriesQ.data?.categories || [];
  const auctions = auctionsQ.data?.auctions || [];

  const sellerItems = Object.fromEntries([
    ["all", "All sellers"],
    ...sellers.map((seller) => [seller.id, seller.name]),
  ]);
  const categoryItems = Object.fromEntries([
    ["all", "All categories"],
    ...categories.map((category) => [category.id, category.name]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auctions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter by status, seller, or category, or search a specific listing.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search title, seller, or email"
        />
        <Select
          value={status}
          onValueChange={(value) => setStatus(value ?? "all")}
          items={Object.fromEntries(statuses.map((item) => [item.value, item.label]))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sellerId}
          onValueChange={(value) => setSellerId(value ?? "all")}
          items={sellerItems}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Created by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sellers</SelectItem>
            {sellers.map((seller) => (
              <SelectItem key={seller.id} value={seller.id}>
                {seller.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={categoryId}
          onValueChange={(value) => setCategoryId(value ?? "all")}
          items={categoryItems}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {auctionsQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading auctions…</p>
      ) : auctionsQ.isError ? (
        <p className="text-sm text-destructive">
          {auctionsQ.error instanceof Error
            ? auctionsQ.error.message
            : "Could not load auctions"}
        </p>
      ) : auctions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No auctions match these filters.
        </p>
      ) : (
        <Card className="py-0">
          <CardContent className="divide-y divide-border p-0">
            {auctions.map((a) => (
              <Link
                key={a.id}
                href={`/auctions/${a.id}`}
                className="flex flex-wrap items-center justify-between gap-4 p-4 hover:bg-muted/50"
              >
                <span>
                  <span className="flex flex-wrap items-center gap-2">
                    {a.title}
                    <Badge variant="secondary" className="uppercase">
                      {a.status}
                    </Badge>
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {a.seller?.name || "Unknown seller"} ·{" "}
                    {a.category?.name || "Uncategorised"}
                  </span>
                </span>
                <span>
                  {formatBdt(
                    Number(a.currentBid) > 0 ? a.currentBid : a.startPrice
                  )}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
