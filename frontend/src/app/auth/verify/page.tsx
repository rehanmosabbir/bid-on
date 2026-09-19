"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, User } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { setSession } = useAuth();
  const [email, setEmail] = useState(params.get("email") || "");
  const [otp, setOtp] = useState(params.get("otp") || "");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(
    params.get("otp") ? `Dev OTP prefilled: ${params.get("otp")}` : ""
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = await api<{ token: string; user: User }>("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
      });
      setSession(data.token, data.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    }
  }

  async function resend() {
    const data = await api<{ devOtp?: string }>("/api/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    if (data.devOtp) {
      setOtp(data.devOtp);
      setInfo(`Dev OTP: ${data.devOtp}`);
    } else setInfo("OTP resent to your email.");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Verify email</h1>
      <p className="mt-2 text-[var(--muted)]">Enter the 6-digit OTP sent to your email.</p>
      <form onSubmit={onSubmit} className="panel mt-8 space-y-4 p-6">
        <input
          className="field"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="field"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          maxLength={6}
          placeholder="OTP"
          required
        />
        {info && <p className="text-sm text-[var(--accent)]">{info}</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button className="btn btn-primary w-full" type="submit">
          Verify
        </button>
        <button type="button" className="btn btn-ghost w-full" onClick={resend}>
          Resend OTP
        </button>
      </form>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyInner />
    </Suspense>
  );
}
