"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; slug: string; _count?: { auctions: number } }>
  >([]);

  useEffect(() => {
    api<{ categories: typeof categories }>("/api/categories").then((d) =>
      setCategories(d.categories)
    );
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Categories</h1>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/auctions?category=${c.slug}`}
            className="panel p-6 transition hover:-translate-y-0.5"
          >
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              {c.name}
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {c._count?.auctions ?? 0} listings
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
