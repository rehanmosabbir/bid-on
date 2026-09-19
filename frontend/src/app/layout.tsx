import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/lib/auth";
import { Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

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
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} antialiased`}>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <footer className="mt-24 border-t border-[var(--line)]">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 text-sm text-[var(--muted)] sm:flex-row sm:justify-between">
              <p>© {new Date().getFullYear()} Bid On · e-Auction Management</p>
              <p>BDT · Secure bidding · Admin-approved listings</p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
