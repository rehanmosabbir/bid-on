# Bid On — Online Auction System

Full-stack e-auction platform (**Next.js** + **Express** + **PostgreSQL**) with real-time bidding and an admin panel.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind |
| Backend | Express, Prisma, Socket.IO |
| Database | PostgreSQL |
| Payments | Stripe Checkout (test) or local sim if no key |
| Auth | JWT + email OTP verification |

## Prerequisites

- Node.js 20+
- PostgreSQL running locally (default URL in `backend/.env`)

## Setup

```bash
# 1) Backend
cd backend
cp .env.example .env   # edit DATABASE_URL if needed
npm install
npx prisma migrate dev
npm run db:seed
npm run dev            # http://localhost:4000

# 2) Frontend (new terminal)
cd frontend
npm install
npm run dev            # http://localhost:3000
```

## Demo accounts

| Email | Password | Role |
|-------|----------|------|
| admin@bidon.local | Password1 | Admin |
| seller@bidon.local | Password1 | Seller |
| buyer@bidon.local | Password1 | Buyer |

## Features

- Register / login with email OTP (OTP logged to console when SMTP is unset)
- Seller listings with image upload → **admin approval**
- Live auctions with countdown + Socket.IO bid updates
- Watchlist, dashboard (bids / listings / transactions)
- Stripe checkout for winners (or simulated payment without Stripe keys)
- Admin: KPIs, charts, approve/reject, suspend users, CSV export

## Env notes

**Backend** (`backend/.env`):

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — signing secret
- `FRONTEND_URL` — CORS origin (default `http://localhost:3000`)
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — optional
- `SMTP_*` — optional; without SMTP, emails print to the API console

**Frontend** (`frontend/.env.local`):

- `NEXT_PUBLIC_API_URL=http://localhost:4000`
