"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, User } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AccountPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", phone: "", address: "", role: "buyer" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
    if (user) {
      setForm({
        name: user.name,
        phone: user.phone || "",
        address: user.address || "",
        role: user.role === "admin" ? "seller" : user.role,
      });
    }
  }, [user, loading, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api<{ user: User }>("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify(form),
    });
    await refresh();
    setMessage("Profile updated.");
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Account</h1>
      <form onSubmit={onSubmit} className="panel mt-8 space-y-4 p-6">
        <input
          className="field"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input className="field" value={user.email} disabled />
        <input
          className="field"
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <textarea
          className="field"
          placeholder="Address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        {user.role !== "admin" && (
          <select
            className="field"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
          </select>
        )}
        <button className="btn btn-primary" type="submit">
          Save changes
        </button>
        {message && <p className="text-sm text-[var(--accent)]">{message}</p>}
      </form>
    </div>
  );
}
