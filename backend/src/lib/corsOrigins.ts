/** Allowed browser origins for CORS / Socket.IO (comma-separated FRONTEND_URL). */
export function getCorsOrigins(): string[] {
  const raw = process.env.FRONTEND_URL || "http://localhost:3000";
  return raw
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

/** Primary frontend origin (first FRONTEND_URL entry), no trailing slash. */
export function getFrontendOrigin(): string {
  return getCorsOrigins()[0] || "http://localhost:3000";
}
