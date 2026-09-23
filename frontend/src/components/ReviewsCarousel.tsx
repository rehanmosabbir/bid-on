"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const reviews = [
  {
    quote:
      "I won a vintage camera in under an hour. The live countdown and instant bid updates made it feel like a real auction floor.",
    name: "Farhan Ahmed",
    role: "Collector · Dhaka",
  },
  {
    quote:
      "Listing was simple, admin approval was clear, and my first sale closed the same week. Bid On treats sellers seriously.",
    name: "Nusrat Jahan",
    role: "Seller · Chittagong",
  },
  {
    quote:
      "Checkout felt secure and the lot details were thorough. I finally trust online auctions again.",
    name: "Priya Sen",
    role: "Buyer · Kolkata",
  },
  {
    quote:
      "Watchlists and real-time sockets mean I never miss the final seconds. The whole experience feels polished.",
    name: "Arif Khan",
    role: "Regular bidder · Sylhet",
  },
];

export function ReviewsCarousel() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduce || paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % reviews.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, [reduce, paused]);

  const go = (dir: -1 | 1) => {
    setIndex((i) => (i + dir + reviews.length) % reviews.length);
  };

  const review = reviews[index];

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.blockquote
            key={review.name}
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -16 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-3xl text-center"
          >
            <Quote
              className="mx-auto size-8 text-primary/40"
              aria-hidden
            />
            <p className="mt-6 font-[family-name:var(--font-display)] text-2xl leading-snug tracking-tight text-foreground sm:text-3xl md:text-4xl">
              “{review.quote}”
            </p>
            <footer className="mt-8">
              <p className="text-sm font-semibold tracking-wide">
                {review.name}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                {review.role}
              </p>
            </footer>
          </motion.blockquote>
        </AnimatePresence>
      </div>

      <div className="mt-10 flex items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Previous review"
          onClick={() => go(-1)}
        >
          <ChevronLeft />
        </Button>
        <div className="flex items-center gap-2">
          {reviews.map((r, i) => (
            <button
              key={r.name}
              type="button"
              aria-label={`Go to review ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index
                  ? "w-7 bg-primary"
                  : "w-1.5 bg-border hover:bg-muted-foreground/40"
              )}
            />
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Next review"
          onClick={() => go(1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
