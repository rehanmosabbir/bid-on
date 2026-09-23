"use client";

import Link from "next/link";
import { useCategories } from "@/hooks/queries";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CategoriesPage() {
  const { data, isLoading } = useCategories();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">
        Categories
      </h1>
      {isLoading ? (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.categories || []).map((c) => (
            <Link key={c.id} href={`/auctions?category=${c.slug}`}>
              <Card className="transition hover:-translate-y-0.5 hover:ring-primary/30">
                <CardHeader>
                  <CardTitle className="font-[family-name:var(--font-display)] text-2xl">
                    {c.name}
                  </CardTitle>
                  <CardDescription>
                    {c._count?.auctions ?? 0} listings
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
