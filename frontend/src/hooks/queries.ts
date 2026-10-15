import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, Auction, User } from "@/lib/api";

export type Category = {
  id: string;
  name: string;
  slug: string;
  liveCount?: number;
  _count?: { auctions: number };
};

export type AdminAuctionFilters = {
  status?: string;
  sellerId?: string;
  categoryId?: string;
  q?: string;
};

export type KycRecord = {
  status: string;
  fullName: string | null;
  documentType: string | null;
  documentNumber: string | null;
  documentUrl: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
};

export type BankRecord = {
  status: string;
  accountName: string | null;
  bankName: string | null;
  accountNumber: string | null;
  branch: string | null;
  routingNumber: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  suspended: boolean;
  verified: boolean;
  kycStatus?: string;
  bankStatus?: string;
  kycFullName?: string | null;
  kycDocumentType?: string | null;
  kycDocumentNumber?: string | null;
  kycDocumentUrl?: string | null;
  kycRejectReason?: string | null;
  bankAccountName?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankBranch?: string | null;
  bankRoutingNumber?: string | null;
  bankRejectReason?: string | null;
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

export function useUpdateAuction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      data:
        | FormData
        | {
            startPrice?: number;
            durationMinutes?: number;
            minBidIncrement?: number;
          }
    ) =>
      api<{ auction: Auction }>(`/api/auctions/${id}`, {
        method: "PATCH",
        data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.auction(id) });
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

export function useAdminUsers(
  enabled = true,
  filters: { role?: string; q?: string } = {}
) {
  const qs = new URLSearchParams();
  if (filters.role && filters.role !== "all") qs.set("role", filters.role);
  if (filters.q) qs.set("q", filters.q);
  const query = qs.toString();
  return useQuery({
    queryKey: ["admin", "users", query || "all"],
    queryFn: () =>
      api<{ users: AdminUser[] }>(
        `/api/admin/users${query ? `?${query}` : ""}`
      ),
    enabled,
  });
}

export function useAdminAuctions(
  statusOrFilters?: string | AdminAuctionFilters,
  enabled = true
) {
  const filters: AdminAuctionFilters =
    typeof statusOrFilters === "string" || statusOrFilters === undefined
      ? { status: statusOrFilters }
      : statusOrFilters;
  const qs = new URLSearchParams();
  if (filters.status && filters.status !== "all") qs.set("status", filters.status);
  if (filters.sellerId && filters.sellerId !== "all") {
    qs.set("sellerId", filters.sellerId);
  }
  if (filters.categoryId && filters.categoryId !== "all") {
    qs.set("categoryId", filters.categoryId);
  }
  if (filters.q) qs.set("q", filters.q);
  const query = qs.toString();
  return useQuery({
    queryKey: ["admin", "auctions", query || "all"],
    queryFn: () =>
      api<{ auctions: Auction[] }>(
        `/api/admin/auctions${query ? `?${query}` : ""}`
      ),
    enabled,
    staleTime: 0,
  });
}

export function useCloseAuction(auctionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api(`/api/auctions/${auctionId}/close`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.auction(auctionId) });
      qc.invalidateQueries({ queryKey: queryKeys.meListings });
      qc.invalidateQueries({ queryKey: ["auctions"] });
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useMyKyc(enabled = true) {
  return useQuery({
    queryKey: ["me", "kyc"],
    queryFn: () => api<{ kyc: KycRecord }>("/api/users/me/kyc"),
    enabled,
  });
}

export function useSubmitKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      api<{ kyc: KycRecord }>("/api/users/me/kyc", {
        method: "POST",
        data: formData,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "kyc"] });
    },
  });
}

export function useMyBank(enabled = true) {
  return useQuery({
    queryKey: ["me", "bank"],
    queryFn: () => api<{ bank: BankRecord }>("/api/users/me/bank"),
    enabled,
  });
}

export function useSubmitBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      accountName: string;
      bankName: string;
      accountNumber: string;
      branch: string;
      routingNumber?: string;
    }) =>
      api<{ bank: BankRecord }>("/api/users/me/bank", {
        method: "PUT",
        data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "bank"] });
    },
  });
}

export function useAdminVerifications(
  filters: {
    role?: string;
    q?: string;
    queue?: string;
    kycStatus?: string;
    bankStatus?: string;
  } = {},
  enabled = true
) {
  const qs = new URLSearchParams();
  if (filters.role && filters.role !== "all") qs.set("role", filters.role);
  if (filters.q) qs.set("q", filters.q);
  if (filters.queue) qs.set("queue", filters.queue);
  if (filters.kycStatus && filters.kycStatus !== "all") {
    qs.set("kycStatus", filters.kycStatus);
  }
  if (filters.bankStatus && filters.bankStatus !== "all") {
    qs.set("bankStatus", filters.bankStatus);
  }
  const query = qs.toString();
  return useQuery({
    queryKey: ["admin", "verifications", query || "all"],
    queryFn: () =>
      api<{ users: AdminUser[] }>(
        `/api/admin/verifications${query ? `?${query}` : ""}`
      ),
    enabled,
    staleTime: 0,
  });
}

export function useReviewKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      reason,
    }: {
      id: string;
      decision: "approved" | "rejected";
      reason?: string;
    }) =>
      api(`/api/admin/users/${id}/kyc`, {
        method: "POST",
        data: { decision, reason },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useReviewBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      reason,
    }: {
      id: string;
      decision: "approved" | "rejected";
      reason?: string;
    }) =>
      api(`/api/admin/users/${id}/bank`, {
        method: "POST",
        data: { decision, reason },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
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
      api<{ email: string; verifyUrl?: string }>("/api/auth/register", {
        method: "POST",
        data: data,
      }),
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: (data: { token: string }) =>
      api<{ token: string; user: User }>("/api/auth/verify", {
        method: "POST",
        data: data,
      }),
  });
}

export function useResendOtp() {
  return useMutation({
    mutationFn: (email: string) =>
      api<{ verifyUrl?: string; message: string }>("/api/auth/resend-otp", {
        method: "POST",
        data: { email },
      }),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      api<{ message: string; email: string; devOtp?: string }>(
        "/api/auth/forgot-password",
        {
          method: "POST",
          data: { email },
        }
      ),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: { email: string; otp: string; password: string }) =>
      api<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        data,
      }),
  });
}
