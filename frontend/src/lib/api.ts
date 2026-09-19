import axios, { AxiosError, AxiosRequestConfig } from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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

export type ApiRequestOptions = {
  method?: AxiosRequestConfig["method"];
  /** JSON object or FormData — do not JSON.stringify */
  data?: unknown;
  /** @deprecated use `data` */
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

function normalizeBody(body: unknown): unknown {
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
}

export async function api<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const payload =
    options.data !== undefined
      ? options.data
      : options.body !== undefined
        ? normalizeBody(options.body)
        : undefined;

  try {
    const response = await apiClient.request<T>({
      url: path,
      method: options.method || (payload !== undefined ? "POST" : "GET"),
      data: payload,
      headers: options.headers,
      params: options.params,
    });
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const ax = err as AxiosError<{ error?: string }>;
      throw new Error(
        ax.response?.data?.error || ax.message || `Request failed (${ax.response?.status ?? 0})`
      );
    }
    throw err;
  }
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
