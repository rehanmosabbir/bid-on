import { Navbar } from "@/components/Navbar";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="relative z-10">{children}</main>
      <footer className="site-footer relative z-10 mt-28 border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-14 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--nav-fg)]">
              Bid On
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed opacity-80">
              Curated live auctions with verified listings and real-time bidding
              across Bangladesh & Asia.
            </p>
          </div>
          <p className="text-xs uppercase tracking-[0.22em] opacity-60">
            BDT · Secure · Admin-approved
          </p>
        </div>
      </footer>
    </>
  );
}
