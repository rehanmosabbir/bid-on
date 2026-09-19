import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, Auction, User } from "@/lib/api";

export type Category = {
  id: string;
  name: string;
  slug: string;
  _count?: { auctions: number };
};

export const queryKeys = {
  auctions: (params?: Record<string, string>) =>
    ["auctions", params ?? {}] as const,
  auction: (id: string) => ["auction", id] as const,
  categories: ["categories"] as const,
  meBids: ["me", "bids"] as const,
  meListings: ["me", "listings"] as const,
  meWatchlist: ["me", "watchlist"] as const,
  meTransactions: ["me", "transactions"] as const,
  adminStats: ["admin", "stats"] as const,
  adminUsers: ["admin", "users"] as const,
  adminAuctions: (status?: string) => ["admin", "auctions", status ?? "all"] as const,
};

export function useAuctions(params: {
  status?: string;
  q?: string;
  category?: string;
} = {}) {
  const qs = new URLSearchParams();
  qs.set("status", params.status || "live");
  if (params.q) qs.set("q", params.q);
  if (params.category) qs.set("category", params.category);

  return useQuery({
    queryKey: queryKeys.auctions(Object.fromEntries(qs)),
    queryFn: () => api<{ auctions: Auction[] }>(`/api/auctions?${qs}`),
  });
}

export function useAuction(id: string) {
  return useQuery({
    queryKey: queryKeys.auction(id),
    queryFn: () =>
      api<{ auction: Auction; watching: boolean }>(`/api/auctions/${id}`),
    enabled: Boolean(id),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => api<{ categories: Category[] }>("/api/categories"),
  });
}

export function useMyBids(enabled = true) {
  return useQuery({
    queryKey: queryKeys.meBids,
    queryFn: () =>
      api<{ bids: Array<{ id: string; amount: number; auction: Auction }> }>(
        "/api/users/me/bids"
      ),
    enabled,
  });
}

export function useMyListings(enabled = true) {
  return useQuery({
    queryKey: queryKeys.meListings,
    queryFn: () => api<{ auctions: Auction[] }>("/api/users/me/listings"),
    enabled,
  });
}

export function useWatchlist(enabled = true) {
  return useQuery({
    queryKey: queryKeys.meWatchlist,
    queryFn: () =>
      api<{ watchlist: Array<{ auction: Auction }> }>("/api/watchlist"),
    enabled,
  });
}

export function useMyTransactions(enabled = true) {
  return useQuery({
    queryKey: queryKeys.meTransactions,
    queryFn: () =>
      api<{
        transactions: Array<{
          id: string;
          amount: number;
          status: string;
          auction: { title: string };
        }>;
      }>("/api/users/me/transactions"),
    enabled,
  });
}

export function usePlaceBid(auctionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) =>
      api(`/api/auctions/${auctionId}/bids`, {
        method: "POST",
        data: { amount },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.auction(auctionId) });
      qc.invalidateQueries({ queryKey: queryKeys.meBids });
    },
  });
}

export function useToggleWatchlist(auctionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (watching: boolean) => {
      if (watching) {
        await api(`/api/watchlist/${auctionId}`, { method: "DELETE" });
      } else {
        await api(`/api/watchlist/${auctionId}`, { method: "POST" });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.auction(auctionId) });
      qc.invalidateQueries({ queryKey: queryKeys.meWatchlist });
    },
  });
}

export function useCreateAuction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      api<{ auction: { id: string } }>("/api/auctions", {
        method: "POST",
        data: formData,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.meListings });
      qc.invalidateQueries({ queryKey: ["auctions"] });
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (data: {
      name: string;
      phone?: string;
      address?: string;
      role?: string;
    }) =>
      api<{ user: User; token?: string }>("/api/users/me", {
        method: "PATCH",
        data: data,
      }),
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: (auctionId: string) =>
      api<{ url?: string; message?: string }>(
        "/api/payments/create-checkout-session",
        {
          method: "POST",
          data: { auctionId },
        }
      ),
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      auctionId: string;
      rating: number;
      comment?: string;
    }) =>
      api("/api/reviews", {
        method: "POST",
        data: data,
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.auction(vars.auctionId) });
    },
  });
}

export function useAdminStats(enabled = true) {
  return useQuery({
    queryKey: queryKeys.adminStats,
    queryFn: () =>
      api<{
        stats: {
          users: number;
          auctions: number;
          live: number;
          pending: number;
          bids: number;
          revenue: number;
        };
        bidsByDay: Array<{ day: string; count: number }>;
      }>("/api/admin/stats"),
    enabled,
  });
}

export function useAdminUsers(enabled = true) {
  return useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: () =>
      api<{
        users: Array<{
          id: string;
          name: string;
          email: string;
          role: string;
          suspended: boolean;
          verified: boolean;
        }>;
      }>("/api/admin/users"),
    enabled,
  });
}

export function useAdminAuctions(status?: string, enabled = true) {
  const qs = status ? `?status=${status}` : "";
  return useQuery({
    queryKey: queryKeys.adminAuctions(status),
    queryFn: () => api<{ auctions: Auction[] }>(`/api/admin/auctions${qs}`),
    enabled,
  });
}

export function useApproveAuction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/api/auctions/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["auctions"] });
    },
  });
}

export function useRejectAuction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api(`/api/auctions/${id}/reject`, {
        method: "POST",
        data: { reason },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
      api(`/api/admin/users/${id}/suspend`, {
        method: "PATCH",
        data: { suspended },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminUsers });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: {
      name: string;
      email: string;
      password: string;
      role: string;
    }) =>
      api<{ email: string; devOtp?: string }>("/api/auth/register", {
        method: "POST",
        data: data,
      }),
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: (data: { email: string; otp: string }) =>
      api<{ token: string; user: User }>("/api/auth/verify", {
        method: "POST",
        data: data,
      }),
  });
}

export function useResendOtp() {
  return useMutation({
    mutationFn: (email: string) =>
      api<{ devOtp?: string }>("/api/auth/resend-otp", {
        method: "POST",
        data: { email },
      }),
  });
}
