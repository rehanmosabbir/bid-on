import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import categoryRoutes from "./routes/categories";
import auctionRoutes from "./routes/auctions";
import bidRoutes from "./routes/bids";
import watchlistRoutes from "./routes/watchlist";
import notificationRoutes from "./routes/notifications";
import reviewRoutes from "./routes/reviews";
import paymentRoutes, { handleStripeWebhook } from "./routes/payments";
import adminRoutes from "./routes/admin";
import { errorHandler } from "./lib/asyncHandler";

export function createApp() {
  const app = express();

  app.post(
    "/api/payments/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      try {
        const sig = req.headers["stripe-signature"] as string;
        await handleStripeWebhook(req.body as Buffer, sig);
        res.json({ received: true });
      } catch (err) {
        console.error(err);
        res.status(400).send(`Webhook Error`);
      }
    }
  );

  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use("/uploads", express.static(path.resolve(process.env.UPLOAD_DIR || "uploads")));

  app.get("/api/health", (_req, res) => res.json({ ok: true, service: "bid-on" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/auctions", auctionRoutes);
  app.use("/api/auctions/:id/bids", bidRoutes);
  app.use("/api/watchlist", watchlistRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/reviews", reviewRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/admin", adminRoutes);
  app.get("/api/search", (req, res) => {
    const qs = new URLSearchParams(req.query as Record<string, string>).toString();
    res.redirect(307, `/api/auctions?${qs}`);
  });

  app.use(errorHandler);
  return app;
}
