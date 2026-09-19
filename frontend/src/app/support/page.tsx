export default function SupportPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Support</h1>
      <p className="mt-4 leading-relaxed text-[var(--muted)]">
        Bid On helps buyers and sellers complete transparent auctions with admin
        listing approval, live bidding, and secure payments. For disputes after
        a sale, contact support with your auction ID and transaction reference.
      </p>
      <div className="panel mt-8 space-y-2 p-6 text-sm">
        <p>Email: support@bidon.local</p>
        <p>Hours: Sat–Thu, 10:00–18:00 (BST)</p>
        <p>Region: Bangladesh & Asia · Currency: BDT</p>
      </div>
    </div>
  );
}
