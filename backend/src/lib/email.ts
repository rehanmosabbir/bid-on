import nodemailer from "nodemailer";

const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

const transporter = hasSmtp
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

export async function sendEmail(to: string, subject: string, html: string) {
  if (!transporter) {
    console.log(`[email:dev] To: ${to} | ${subject}\n${html}`);
    return;
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || "Bid On <noreply@bidon.local>",
    to,
    subject,
    html,
  });
}

export function otpEmailHtml(code: string) {
  return `<p>Your Bid On verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`;
}
