const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "buyer" | "seller" | "admin";
  verified?: boolean;
  ratingAvg?: number;
  phone?: string | null;
  address?: string | null;
};

export type Auction = {
  id: string;
  title: string;
  description: string;
  images: string[];
  startPrice: string | number;
  reservePrice?: string | number | null;
  maxPriceCap?: string | number | null;
  currentBid: string | number;
  bidCount: number;
  status: string;
  startsAt?: string | null;
  endsAt: string;
  category?: { id: string; name: string; slug: string };
  seller?: { id: string; name: string; ratingAvg?: number };
  winner?: { id: string; name: string } | null;
  bids?: Array<{
    id: string;
    amount: string | number;
    createdAt: string;
    bidder: { id: string; name: string };
  }>;
  _count?: { bids: number; watchlist?: number };
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function mediaUrl(src: string) {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  return `${API_URL}${src}`;
}

export function formatBdt(value: string | number) {
  const n = Number(value);
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(n);
}

export { API_URL };
