"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function SellPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    startPrice: "",
    reservePrice: "",
    maxPriceCap: "",
    durationHours: "72",
    imageUrl: "",
  });

  useEffect(() => {
    if (!loading && (!user || (user.role !== "seller" && user.role !== "admin"))) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    api<{ categories: Array<{ id: string; name: string }> }>("/api/categories").then(
      (d) => {
        setCategories(d.categories);
        if (d.categories[0]) {
          setForm((f) => ({ ...f, categoryId: d.categories[0].id }));
        }
      }
    );
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v) body.append(k, v);
      });
      if (files) Array.from(files).forEach((f) => body.append("images", f));
      const data = await api<{ auction: { id: string } }>("/api/auctions", {
        method: "POST",
        body,
      });
      router.push(`/auctions/${data.auction.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
    }
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">
        Create listing
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Submissions require admin approval before going live.
      </p>
      <form onSubmit={onSubmit} className="panel mt-8 space-y-4 p-6">
        <input
          className="field"
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <textarea
          className="field min-h-32"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />
        <select
          className="field"
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className="field"
            type="number"
            placeholder="Start price (BDT)"
            value={form.startPrice}
            onChange={(e) => setForm({ ...form, startPrice: e.target.value })}
            required
          />
          <input
            className="field"
            type="number"
            placeholder="Reserve (optional)"
            value={form.reservePrice}
            onChange={(e) => setForm({ ...form, reservePrice: e.target.value })}
          />
          <input
            className="field"
            type="number"
            placeholder="Max cap (optional)"
            value={form.maxPriceCap}
            onChange={(e) => setForm({ ...form, maxPriceCap: e.target.value })}
          />
        </div>
        <input
          className="field"
          type="number"
          placeholder="Duration hours"
          value={form.durationHours}
          onChange={(e) => setForm({ ...form, durationHours: e.target.value })}
        />
        <input
          className="field"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(e.target.files)}
        />
        <input
          className="field"
          placeholder="Or paste image URL"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
        />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button className="btn btn-accent" type="submit">
          Submit for approval
        </button>
      </form>
    </div>
  );
}
