import { prisma } from "./prisma";

export async function assertReadyToTransact(
  userId: string,
  purpose: "bid" | "sell"
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, kycStatus: true, bankStatus: true },
  });
  if (!user) throw new Error("User not found");
  if (purpose === "bid" && user.role === "admin") {
    throw new Error("Admins cannot place bids");
  }
  if (user.role === "admin") return;

  const verb = purpose === "bid" ? "bidding" : "creating a listing";
  if (user.kycStatus !== "approved") {
    throw new Error(`KYC verification is required before ${verb}`);
  }
  if (user.bankStatus !== "approved") {
    throw new Error(`Approved bank details are required before ${verb}`);
  }
}
