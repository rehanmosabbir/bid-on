"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "buyer",
  });
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = await api<{ email: string; devOtp?: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const qs = new URLSearchParams({ email: data.email });
      if (data.devOtp) qs.set("otp", data.devOtp);
      router.push(`/auth/verify?${qs}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Register</h1>
      <p className="mt-2 text-[var(--muted)]">
        Strong password required (8+ chars, uppercase, number).
      </p>
      <form onSubmit={onSubmit} className="panel mt-8 space-y-4 p-6">
        <input
          className="field"
          placeholder="Full name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="field"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          className="field"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <select
          className="field"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
        </select>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button className="btn btn-primary w-full" type="submit">
          Create account
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        Already registered?{" "}
        <Link href="/auth/login" className="text-[var(--accent)]">
          Log in
        </Link>
      </p>
    </div>
  );
}
