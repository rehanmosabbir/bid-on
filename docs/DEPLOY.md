# Deploy Bid On — Vercel (frontend) + Railway (backend)

This guide deploys the Next.js app to **Vercel** and the Express/Prisma API to **Railway**, with managed PostgreSQL and a persistent volume for uploads.

## Architecture

| Piece | Host | Root directory |
|-------|------|----------------|
| Frontend | Vercel | `frontend` |
| Backend API | Railway | `backend` |
| Database | Railway Postgres | — |
| Uploads | Railway Volume at `/data/uploads` | — |

Wire the two apps together:

- Vercel: `NEXT_PUBLIC_API_URL=https://<your-railway-api-host>` (no trailing slash)
- Railway: `FRONTEND_URL=https://<your-vercel-app>.vercel.app` (no trailing slash)

## Prerequisites

- GitHub repo with this project pushed
- [Vercel](https://vercel.com) account
- [Railway](https://railway.app) account
- Strong `JWT_SECRET` for production
- Optional: Resend / SMTP and Stripe test keys

## 1. Deploy the backend on Railway

1. Create a new Railway project → **Deploy from GitHub** → select this repo.
2. Open the **API service** → **Settings** (required for this monorepo):
   - **Root Directory:** `/backend` (not `/` — if left empty, Railpack fails looking for Nx/Next at the repo root)
   - **Config-as-code path:** `/backend/railway.toml`
   - Save, then **Redeploy**
3. Confirm build/start (from [`backend/railway.toml`](../backend/railway.toml)):
   - Build: `npm run build`
   - Start: `npm start` (runs `prisma migrate deploy` then `node dist/index.js`)
   - Healthcheck: `/api/health`
4. Add a **PostgreSQL** plugin/database to the project. Link it so `DATABASE_URL` is available to the API service.
5. Add a **Volume** mounted at `/data/uploads` so auction images survive redeploys.
6. Set variables on the API service:

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | long random secret |
| `FRONTEND_URL` | your Vercel URL (set after frontend deploy if needed) |
| `UPLOAD_DIR` | `/data/uploads` |
| `RESEND_API_KEY` / `RESEND_FROM` | optional email |
| `SMTP_*` | optional SMTP fallback |
| `STRIPE_SECRET_KEY` | optional |
| `STRIPE_WEBHOOK_SECRET` | optional (see Stripe below) |
| `STRIPE_CURRENCY` | `usd` (or your enabled currency) |

`DATABASE_URL` and `PORT` are normally provided by Railway.

7. Generate a public HTTPS domain for the service (**Settings → Networking → Generate Domain**).
8. Deploy and open `https://<railway-host>/api/health` — expect `{ "ok": true, "service": "bid-on" }`.
9. Optional demo data (once): open Railway shell for the service and run `npm run db:seed`.

### Stripe webhooks (if using Stripe)

In the [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks) (test mode), add endpoint:

`https://<railway-host>/api/payments/webhook`

Subscribe to Checkout session events you already handle, copy the signing secret into `STRIPE_WEBHOOK_SECRET`, and redeploy.

## 2. Deploy the frontend on Vercel

1. [Import the GitHub repo](https://vercel.com/new) into Vercel.
2. Configure the project:
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend`
   - Leave build/output defaults (`next build` / `.next`)
3. Environment variables → Production (and Preview if you want):

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://<railway-host>` (no trailing slash) |

4. Deploy. Note the production URL (`https://….vercel.app`).
5. Back on Railway, set `FRONTEND_URL` to that Vercel URL (exact origin, no path/trailing slash) and **redeploy** the API so CORS and Socket.IO allow the frontend.

## 3. Smoke test

- [ ] `GET /api/health` on Railway returns OK  
- [ ] Register / login from the Vercel site  
- [ ] Live auction bids update (Socket.IO)  
- [ ] Seller image upload persists after an API redeploy (volume)  
- [ ] Stripe checkout (if configured) completes and webhook/session-status marks paid  

## Order of operations tip

If you deploy the API before the frontend exists, set a temporary `FRONTEND_URL` (or update it right after the first Vercel deploy). CORS and Socket.IO both read `FRONTEND_URL` at runtime.

## Troubleshooting

### `Railpack failed… Detected an Nx workspace with a Next.js app`

This is **not** an Nx repo. Railway is building from the **repository root** instead of `backend/`.

**Fix:** Service → **Settings** → **Root Directory** = `/backend`, config file = `/backend/railway.toml` → Redeploy.

You do **not** need `RAILPACK_NX_APP` for Bid On.

### Build succeeds but CORS / Socket.IO fail

`FRONTEND_URL` on Railway must exactly match the Vercel origin (scheme + host, no trailing slash), then redeploy the API.

## Custom domains (optional)

1. Attach a custom domain on Vercel for the frontend.
2. Attach a custom domain on Railway for the API.
3. Update both `FRONTEND_URL` and `NEXT_PUBLIC_API_URL` to the new origins and redeploy each side.
4. Update the Stripe webhook URL if you use Stripe.

## Local vs production env files

| App | Local file | Example |
|-----|------------|---------|
| Backend | `backend/.env` | [`backend/.env.example`](../backend/.env.example) |
| Frontend | `frontend/.env.local` | [`frontend/.env.example`](../frontend/.env.example) |

Never commit real secrets. Production secrets live only in the Vercel and Railway dashboards.
