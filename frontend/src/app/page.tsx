"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { AuctionCard } from "@/components/AuctionCard";
import { Reveal, Stagger, StaggerItem } from "@/components/Motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuctions } from "@/hooks/queries";
import { searchSchema } from "@/lib/schemas";
import { z } from "zod";

type SearchValues = z.infer<typeof searchSchema>;

export default function HomePage() {
  const router = useRouter();
  const { data, isLoading } = useAuctions({ status: "live" });
  const { register, handleSubmit } = useForm<SearchValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: { q: "" },
  });

  const auctions = data?.auctions.slice(0, 6) ?? [];

  return (
    <div>
      <section className="relative min-h-[88vh] overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1499781350541-7783f73ce6a5?auto=format&fit=crop&w=2000&q=80)",
          }}
          initial={{ scale: 1.14 }}
          animate={{ scale: 1 }}
          transition={{ duration: 14, ease: "linear" }}
        />
        <div className="absolute inset-0" style={{ background: "var(--hero-veil)" }} />
        <div
          className="absolute inset-x-0 bottom-0 h-36"
          style={{
            background: "linear-gradient(to top, var(--paper), transparent)",
          }}
        />

        <div className="relative mx-auto flex min-h-[88vh] max-w-6xl flex-col justify-end px-4 pb-20 pt-32 text-white">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-[11px] font-semibold uppercase tracking-[0.4em] text-[var(--brand-hot)]"
          >
            Live auction house
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 max-w-3xl font-[family-name:var(--font-display)] text-6xl leading-[0.95] sm:text-8xl"
          >
            Bid On
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-5 max-w-md text-base leading-relaxed text-white/80 sm:text-lg"
          >
            Discover curated lots, bid in real time, and win with confidence.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55 }}
            className="mt-9 flex flex-wrap gap-3"
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

      <section className="mx-auto max-w-6xl px-4 py-20">
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
                router.push(`/auctions?q=${encodeURIComponent(values.q || "")}`);
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

      <section className="relative overflow-hidden border-y border-border">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1600&q=80)",
          }}
        />
        <div className="absolute inset-0 bg-[var(--nav-bg)]/90" />
        <Reveal className="relative mx-auto max-w-6xl px-4 py-24 text-center text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--brand-hot)]">
            Why Bid On
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-5xl">
            Every listing reviewed. Every bid live. Every payment secured.
          </h2>
          <Link href="/auth/register">
            <Button
              size="lg"
              className="mt-10 border border-white/50 bg-white text-[#0d1712] hover:bg-[var(--brand-hot)] hover:text-white dark:bg-white dark:text-[#0d1712] dark:hover:bg-[var(--brand-hot)] dark:hover:text-white"
            >
              Create your account
            </Button>
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
