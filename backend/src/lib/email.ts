import dns from "dns";
import nodemailer from "nodemailer";

// Prefer IPv4 — Gmail IPv6 often returns ENETUNREACH on local networks
dns.setDefaultResultOrder("ipv4first");

const resendApiKey = process.env.RESEND_API_KEY?.trim();
const hasResend = Boolean(resendApiKey);

const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure =
  process.env.SMTP_SECURE === "true" ||
  process.env.SMTP_SECURE === "1" ||
  smtpPort === 465;

const transporter = hasSmtp
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpSecure,
      family: 4,
      lookup: (hostname, options, callback) => {
        const opts =
          typeof options === "object" && options
            ? { ...options, family: 4, all: false }
            : { family: 4 };
        dns.lookup(hostname, opts as dns.LookupOneOptions, callback as never);
      },
      connectionTimeout: 12_000,
      greetingTimeout: 12_000,
      socketTimeout: 20_000,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

export type SendEmailResult = { delivered: boolean };

function defaultFrom() {
  return (
    process.env.SMTP_FROM ||
    process.env.RESEND_FROM ||
    "Bid On <onboarding@resend.dev>"
  );
}

async function sendWithResend(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: defaultFrom(),
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}

async function sendWithSmtp(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  if (!transporter) throw new Error("SMTP not configured");
  await transporter.sendMail({
    from: defaultFrom(),
    to,
    subject,
    html,
  });
}

/**
 * Delivery order: Resend (HTTPS) → SMTP → console fallback.
 * Resend works on networks that block Gmail SMTP ports.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<SendEmailResult> {
  if (hasResend) {
    try {
      await sendWithResend(to, subject, html);
      return { delivered: true };
    } catch (err) {
      console.error("[email] Resend failed; trying next transport:", err);
    }
  }

  if (transporter) {
    try {
      await sendWithSmtp(to, subject, html);
      return { delivered: true };
    } catch (err) {
      console.error("[email] SMTP send failed; falling back to console:", err);
    }
  }

  console.log(`[email:dev] To: ${to} | ${subject}\n${html}`);
  return { delivered: false };
}

export function verifyEmailHtml(verifyUrl: string) {
  return `<p>Welcome to Bid On.</p>
<p><a href="${verifyUrl}">Click here to verify your email</a>.</p>
<p>Or copy this link into your browser:</p>
<p>${verifyUrl}</p>
<p>This link expires in 24 hours.</p>`;
}

export function resetOtpEmailHtml(code: string) {
  return `<p>Your Bid On password reset code is <strong>${code}</strong>. It expires in 10 minutes.</p><p>If you did not request a reset, you can ignore this email.</p>`;
}
