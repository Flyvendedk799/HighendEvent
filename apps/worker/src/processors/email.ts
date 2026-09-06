import type { Job } from "bullmq";
import type { EmailJobData } from "../queues.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Renders a minimal transactional HTML body (stub until Resend/templates land). */
export function renderEmailHtml(data: EmailJobData): string {
  if (data.html) {
    return data.html;
  }

  const vars = data.vars ?? {};
  const greeting = escapeHtml(vars.name ?? "there");
  const body = escapeHtml(vars.body ?? "Thanks for using Rentora.");
  const ctaLabel = escapeHtml(vars.ctaLabel ?? "Open Rentora");
  const ctaUrl = escapeHtml(vars.ctaUrl ?? "https://rentora.app");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(data.subject)}</title>
  </head>
  <body style="font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; padding: 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px;">
      <tr>
        <td>
          <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #0f766e;">Rentora</p>
          <h1 style="margin: 0 0 16px; font-size: 22px;">${escapeHtml(data.subject)}</h1>
          <p style="margin: 0 0 16px;">Hi ${greeting},</p>
          <p style="margin: 0 0 24px; line-height: 1.5;">${body}</p>
          <p style="margin: 0;">
            <a href="${ctaUrl}" style="display: inline-block; background: #0f766e; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 8px;">${ctaLabel}</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function processEmail(job: Job<EmailJobData>): Promise<{
  htmlLength: number;
  provider: "resend" | "stub";
  id?: string;
}> {
  const html = renderEmailHtml(job.data);
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "Rentora <onboarding@resend.dev>";

  if (!apiKey) {
    console.log(
      `[email] stub job=${job.id} to=${job.data.to} subject=${JSON.stringify(job.data.subject)} htmlBytes=${html.length}`,
    );
    return { htmlLength: html.length, provider: "stub" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [job.data.to],
      subject: job.data.subject,
      html,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) {
    throw new Error(payload.message ?? `Resend failed (${res.status})`);
  }

  console.log(`[email] resend job=${job.id} id=${payload.id} to=${job.data.to}`);
  return { htmlLength: html.length, provider: "resend", id: payload.id };
}
