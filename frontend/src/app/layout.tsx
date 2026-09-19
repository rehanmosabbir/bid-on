import { Navbar } from "@/components/Navbar";
import { Providers } from "@/components/Providers";
import { Newsreader, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const display = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
});

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: "Bid On — Online Auction",
  description: "Secure real-time auctions for Bangladesh & Asia",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans", geist.variable)}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('bidon-theme');var dark=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark);document.documentElement.setAttribute('data-theme',dark?'dark':'light');}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${display.variable} ${geist.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <Navbar />
          <main className="relative z-10">{children}</main>
          <footer className="site-footer relative z-10 mt-28 border-t border-border">
            <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-14 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--nav-fg)]">
                  Bid On
                </p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed opacity-80">
                  Curated live auctions with verified listings and real-time
                  bidding across Bangladesh & Asia.
                </p>
              </div>
              <p className="text-xs uppercase tracking-[0.22em] opacity-60">
                BDT · Secure · Admin-approved
              </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
