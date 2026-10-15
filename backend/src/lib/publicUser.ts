import { Prisma } from "@prisma/client";

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  verified: true,
  phone: true,
  address: true,
  ratingAvg: true,
  ratingCount: true,
  kycStatus: true,
  bankStatus: true,
} satisfies Prisma.UserSelect;

type PublicUserRow = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export function toPublicUser(user: PublicUserRow) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    verified: user.verified,
    phone: user.phone,
    address: user.address,
    ratingAvg: user.ratingAvg,
    ratingCount: user.ratingCount,
    kycStatus: user.kycStatus,
    bankStatus: user.bankStatus,
  };
}
