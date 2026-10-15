import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: "Electronics", slug: "electronics" },
    { name: "Fashion", slug: "fashion" },
    { name: "Home & Living", slug: "home-living" },
    { name: "Collectibles", slug: "collectibles" },
    { name: "Vehicles", slug: "vehicles" },
    { name: "Art", slug: "art" },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name },
      create: c,
    });
  }

  const passwordHash = await bcrypt.hash("Password1", 12);

  const verifiedProfile = {
    kycStatus: "approved" as const,
    kycFullName: "Demo User",
    kycDocumentType: "nid",
    kycDocumentNumber: "1234567890",
    kycSubmittedAt: new Date(),
    kycReviewedAt: new Date(),
    bankStatus: "approved" as const,
    bankAccountName: "Demo User",
    bankName: "Demo Bank",
    bankAccountNumber: "0123456789",
    bankBranch: "Gulshan",
    bankSubmittedAt: new Date(),
    bankReviewedAt: new Date(),
  };

  const admin = await prisma.user.upsert({
    where: { email: "admin@bidon.local" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@bidon.local",
      passwordHash,
      role: "admin",
      verified: true,
    },
  });

  const seller = await prisma.user.upsert({
    where: { email: "seller@bidon.local" },
    update: { ...verifiedProfile, kycFullName: "Demo Seller", bankAccountName: "Demo Seller" },
    create: {
      name: "Demo Seller",
      email: "seller@bidon.local",
      passwordHash,
      role: "seller",
      verified: true,
      ...verifiedProfile,
      kycFullName: "Demo Seller",
      bankAccountName: "Demo Seller",
    },
  });

  const buyer = await prisma.user.upsert({
    where: { email: "buyer@bidon.local" },
    update: { ...verifiedProfile, kycFullName: "Demo Buyer", bankAccountName: "Demo Buyer" },
    create: {
      name: "Demo Buyer",
      email: "buyer@bidon.local",
      passwordHash,
      role: "buyer",
      verified: true,
      ...verifiedProfile,
      kycFullName: "Demo Buyer",
      bankAccountName: "Demo Buyer",
    },
  });

  const electronics = await prisma.category.findUniqueOrThrow({
    where: { slug: "electronics" },
  });

  const existing = await prisma.auction.count();
  if (existing === 0) {
    await prisma.auction.create({
      data: {
        sellerId: seller.id,
        categoryId: electronics.id,
        title: "Vintage Mechanical Watch",
        description:
          "A classic mechanical watch in excellent condition. Perfect for collectors. Starting bid open now.",
        images: [
          "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800",
        ],
        startPrice: 5000,
        reservePrice: 8000,
        maxPriceCap: 100000,
        minBidIncrement: 100,
        currentBid: 0,
        status: "live",
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    await prisma.auction.create({
      data: {
        sellerId: seller.id,
        categoryId: electronics.id,
        title: "Wireless Noise-Cancelling Headphones",
        description:
          "Premium over-ear headphones with active noise cancellation and 30-hour battery life.",
        images: [
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
        ],
        startPrice: 2500,
        minBidIncrement: 50,
        currentBid: 0,
        status: "pending",
        endsAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
    });
  }

  console.log("Seed complete:");
  console.log("  admin@bidon.local / Password1");
  console.log("  seller@bidon.local / Password1");
  console.log("  buyer@bidon.local / Password1");
  console.log(`  users: ${admin.email}, ${seller.email}, ${buyer.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
