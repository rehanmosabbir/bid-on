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

## Frontend libraries

- **Axios** — HTTP client for the API
- **Tailwind CSS** — styling
- **React Hook Form** + Zod — form state and validation
- **TanStack Query** — server state, caching, mutations
- **Vitest** — unit / client tests (`npm run test` in `frontend/`)

## Backend tests

```bash
cd backend
npm test   # Vitest + Supertest (needs Postgres + seed data)
```

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

## Stripe sandbox payments

Checkout already uses **Stripe Checkout Sessions**. With no secret key, payments are simulated.

### 1) Put test keys in `backend/.env`

```env
STRIPE_SECRET_KEY="rkcs_test_... or sk_test_..."
STRIPE_CURRENCY="usd"
STRIPE_WEBHOOK_SECRET=""   # optional for local; see step 3
FRONTEND_URL="http://localhost:3000"
```

Create a throwaway sandbox (keys printed once):

```bash
npx @stripe/cli sandbox create --from-git --non-interactive
```

Or copy a **test** secret from the [Stripe Dashboard (test mode)](https://dashboard.stripe.com/test/apikeys).

### 2) Restart the API

```bash
cd backend
npm run dev
```

### 3) (Recommended) Forward webhooks locally

```bash
npx @stripe/cli listen --forward-to localhost:4000/api/payments/webhook
```

Copy the `whsec_...` value into `STRIPE_WEBHOOK_SECRET` and restart the API.

Without `stripe listen`, Bid On still marks the auction paid when you return from Checkout (`/api/payments/session-status`).

### 4) Pay with a test card

1. Log in as a **buyer** who won an **ended** auction  
2. Open the lot → **Pay now** → **Pay with Stripe (test)**  
3. Card: `4242 4242 4242 4242` · any future expiry · any CVC · any ZIP  

Declined: `4000 0000 0000 9995`

### Env notes

**Backend** (`backend/.env`):

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — signing secret
- `FRONTEND_URL` — CORS origin (default `http://localhost:3000`)
- `STRIPE_SECRET_KEY` — test/sandbox secret (empty = simulate)
- `STRIPE_WEBHOOK_SECRET` — from `stripe listen` or Dashboard
- `STRIPE_CURRENCY` — `usd` for sandboxes; `bdt` when enabled
- `SMTP_*` — optional; without SMTP, emails print to the API console

**Frontend** (`frontend/.env.local`):

- `NEXT_PUBLIC_API_URL=http://localhost:4000`
