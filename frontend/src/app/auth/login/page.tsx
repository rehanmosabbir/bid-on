"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const user = await login(email, password);
      router.push(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      if (msg.includes("not verified")) {
        router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(msg);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Log in</h1>
      <p className="mt-2 text-[var(--muted)]">
        Demo: buyer@bidon.local / Password1
      </p>
      <form onSubmit={onSubmit} className="panel mt-8 space-y-4 p-6">
        <input
          className="field"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="field"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button className="btn btn-primary w-full" type="submit">
          Log in
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        No account? <Link href="/auth/register" className="text-[var(--accent)]">Register</Link>
      </p>
    </div>
  );
}
