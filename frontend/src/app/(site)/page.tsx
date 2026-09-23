"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useReducedMotion } from "framer-motion";
import { Gavel, ShieldCheck, Zap } from "lucide-react";
import { AuctionCard } from "@/components/AuctionCard";
import { Reveal, Stagger, StaggerItem } from "@/components/Motion";
import { ReviewsCarousel } from "@/components/ReviewsCarousel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuctions } from "@/hooks/queries";
import { searchSchema } from "@/lib/schemas";
import { z } from "zod";

type SearchValues = z.infer<typeof searchSchema>;

const steps = [
  {
    icon: ShieldCheck,
    title: "Curated lots",
    body: "Every listing is reviewed before it goes live — no mystery inventory.",
  },
  {
    icon: Zap,
    title: "Live bidding",
    body: "Watch the clock, place bids in real time, and see updates as they happen.",
  },
  {
    icon: Gavel,
    title: "Win with confidence",
    body: "Secure checkout for winners, with clear status from hammer to payment.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { data, isLoading } = useAuctions({ status: "live" });
  const { register, handleSubmit } = useForm<SearchValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: { q: "" },
  });

  const auctions = data?.auctions.slice(0, 6) ?? [];

  return (
    <div>
      {/* Hero — brand first, one composition, full-bleed image */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1499781350541-7783f73ce6a5?auto=format&fit=crop&w=2000&q=80)",
          }}
          initial={reduce ? false : { scale: 1.12 }}
          animate={reduce ? undefined : { scale: 1 }}
          transition={{ duration: 18, ease: "linear" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "var(--hero-veil)" }}
        />
        {!reduce && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-24 top-1/4 size-[28rem] rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--brand) 35%, transparent), transparent 70%)",
            }}
            animate={{ opacity: [0.35, 0.55, 0.35], y: [0, -24, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <div
          className="absolute inset-x-0 bottom-0 h-40"
          style={{
            background: "linear-gradient(to top, var(--paper), transparent)",
          }}
        />

        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-4 pb-24 pt-36 text-white sm:pt-40">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
            className="text-[11px] font-semibold uppercase tracking-[0.4em] text-[var(--brand-hot)]"
          >
            Live auction house
          </motion.p>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.9,
              delay: 0.22,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-6 max-w-3xl font-[family-name:var(--font-display)] text-6xl leading-[0.92] sm:mt-8 sm:text-8xl lg:text-9xl"
          >
            Bid On
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.42 }}
            className="mt-8 max-w-md text-base leading-relaxed text-white/80 sm:mt-10 sm:text-lg"
          >
            Discover curated lots, bid in real time, and win with confidence.
          </motion.p>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.58 }}
            className="mt-10 flex flex-wrap gap-3 sm:mt-12"
          >
            <Link href="/auctions">
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Browse live
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button
                size="lg"
                className="border border-white/50 bg-white text-[#0d1712] hover:bg-white/90 dark:border-white/50 dark:bg-white dark:text-[#0d1712] dark:hover:bg-white/90"
              >
                Start bidding
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:py-28">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
            How it works
          </p>
          <h2 className="mt-3 max-w-xl font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-5xl">
            From discovery to the final strike
          </h2>
        </Reveal>
        <Stagger className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <StaggerItem key={step.title}>
                <div className="border-t border-border pt-6">
                  <Icon
                    className="size-6 text-primary"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <h3 className="mt-5 font-[family-name:var(--font-display)] text-2xl">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      {/* Live auctions */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
                Happening now
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl sm:text-5xl">
                Live right now
              </h2>
            </div>
            <form
              className="flex w-full max-w-md gap-2"
              onSubmit={handleSubmit((values) => {
                router.push(
                  `/auctions?q=${encodeURIComponent(values.q || "")}`
                );
              })}
            >
              <Input
                className="flex-1"
                placeholder="Search lots…"
                {...register("q")}
              />
              <Button type="submit" className="shrink-0">
                Search
              </Button>
            </form>
          </div>
        </Reveal>

        <div className="mt-10 border-t border-border">
          {isLoading ? (
            <div className="space-y-4 py-8">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : auctions.length === 0 ? (
            <p className="py-12 text-muted-foreground">No live auctions yet.</p>
          ) : (
            <Stagger>
              {auctions.map((a) => (
                <StaggerItem key={a.id}>
                  <AuctionCard auction={a} />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </div>

        <Reveal delay={0.1} className="mt-10 text-center">
          <Link href="/auctions">
            <Button variant="ghost">View all auctions</Button>
          </Link>
        </Reveal>
      </section>

      {/* Reviews carousel */}
      <section className="border-y border-border bg-muted/35 py-24 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
              Voices from the floor
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl sm:text-5xl">
              Trusted by bidders & sellers
            </h2>
          </Reveal>
          <Reveal delay={0.12} className="mt-14">
            <ReviewsCarousel />
          </Reveal>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1600&q=80)",
          }}
          initial={reduce ? false : { scale: 1.08 }}
          whileInView={reduce ? undefined : { scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 12, ease: "linear" }}
        />
        <div className="absolute inset-0 bg-[var(--nav-bg)]/90" />
        <Reveal className="relative mx-auto max-w-6xl px-4 py-28 text-center text-white sm:py-32">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--brand-hot)]">
            Why Bid On
          </p>
          <h2 className="mx-auto mt-5 max-w-2xl font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-5xl">
            Every listing reviewed. Every bid live. Every payment secured.
          </h2>
          <Link href="/auth/register">
            <Button
              size="lg"
              className="mt-12 border border-white/50 bg-white text-[#0d1712] hover:bg-[var(--brand-hot)] hover:text-white dark:bg-white dark:text-[#0d1712] dark:hover:bg-[var(--brand-hot)] dark:hover:text-white"
            >
              Create your account
            </Button>
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
