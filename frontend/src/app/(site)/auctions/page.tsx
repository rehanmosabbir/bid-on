"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { AuctionCard } from "@/components/AuctionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuctions, useCategories } from "@/hooks/queries";

function AuctionsInner() {
  const params = useSearchParams();
  const [filters, setFilters] = useState({
    q: params.get("q") || "",
    category: params.get("category") || "",
  });

  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: filters,
  });

  const category = watch("category");
  const { data: catData } = useCategories();
  const { data, isLoading } = useAuctions({
    status: "live",
    q: filters.q || undefined,
    category: filters.category || undefined,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
        Catalogue
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl">
        Auctions
      </h1>
      <p className="mt-3 max-w-lg text-muted-foreground">
        Filter by keyword and category. Bids update in real time.
      </p>
      <form
        className="mt-8 flex flex-col gap-3 sm:flex-row"
        onSubmit={handleSubmit((values) =>
          setFilters({
            q: values.q || "",
            category: values.category || "",
          })
        )}
      >
        <Input placeholder="Search…" {...register("q")} />
        <Select
          value={category || "all"}
          onValueChange={(value) =>
            setValue("category", !value || value === "all" ? "" : value)
          }
          items={{
            all: "All categories",
            ...Object.fromEntries(
              (catData?.categories || []).map((c) => [c.slug, c.name])
            ),
          }}
        >
          <SelectTrigger className="w-full sm:max-w-xs">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(catData?.categories || []).map((c) => (
              <SelectItem key={c.id} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="submit"
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Apply
        </Button>
      </form>
      <div className="mt-8 border-t border-border">
        {isLoading ? (
          <p className="py-10 text-muted-foreground">Loading…</p>
        ) : (data?.auctions || []).length === 0 ? (
          <p className="py-10 text-muted-foreground">No auctions found.</p>
        ) : (
          data!.auctions.map((a) => <AuctionCard key={a.id} auction={a} />)
        )}
      </div>
    </div>
  );
}

export default function AuctionsPage() {
  return (
    <Suspense fallback={<p className="p-10 text-muted-foreground">Loading…</p>}>
      <AuctionsInner />
    </Suspense>
  );
}
