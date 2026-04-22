import nodemailer, { type Transporter } from "nodemailer";

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null; // Mailer disabled (dev / not configured)
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return cachedTransporter;
}

export interface MailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export async function sendMail(params: MailParams): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[mailer] SMTP not configured; skipping send to", params.to);
    return false;
  }

  const from =
    params.from ||
    process.env.SMTP_FROM ||
    `Olive Labs <no-reply@olivecomunicacao.com.br>`;

  try {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
    });
    return true;
  } catch (err) {
    console.error("[mailer] send failed:", err);
    return false;
  }
}

export function appBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

export function renderBrandedEmail(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"/><title>${title}</title></head>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:Montserrat,Arial,sans-serif;color:#1a1a1d;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="background:#94C020;padding:24px;text-align:center;">
      <div style="font-size:20px;font-weight:800;color:#0a0f0a;">Olive Labs</div>
    </div>
    <div style="padding:32px 28px;">
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1a1a1d;">${title}</h2>
      ${bodyHtml}
    </div>
    <div style="padding:16px 28px;background:#fafafa;color:#6b6f76;font-size:12px;text-align:center;">
      © ${new Date().getFullYear()} Olive Labs — todos os direitos reservados.
    </div>
  </div>
</body>
</html>`;
}
