import type { Job } from "bullmq";
import { prisma } from "@rentora/db";
import type { EmailJobData } from "../queues.js";
import { interpolate, toPlainText, wrapInLayout, type TemplateVars } from "../email/render.js";
import { sendEmail, type SendResult } from "../email/provider.js";

/**
 * Fallback copy for a tenant that has deleted or never had a given template. Losing a booking
 * confirmation because a template row is missing would be worse than sending a plain one.
 */
const FALLBACK_TEMPLATES: Record<string, { subject: string; bodyHtml: string }> = {
  booking_confirmation: {
    subject: "Your booking {{bookingNo}} is confirmed",
    bodyHtml:
      "<p>Hi {{customerName}},</p><p>Thanks for booking with {{storeName}}. Your rental runs {{startDate}} to {{endDate}}.</p><p>Total: {{total}}</p>",
  },
  payment_reminder: {
    subject: "Balance due for booking {{bookingNo}}",
    bodyHtml:
      "<p>Hi {{customerName}},</p><p>The remaining balance of {{remaining}} for booking {{bookingNo}} is due before {{startDate}}.</p>",
  },
  status_changed: {
    subject: "Booking {{bookingNo}} is now {{statusLabel}}",
    bodyHtml: "<p>Hi {{customerName}},</p><p>Your booking is now <b>{{statusLabel}}</b>.</p>",
  },
  booking_cancelled: {
    subject: "Booking {{bookingNo}} was cancelled",
    bodyHtml: "<p>Hi {{customerName}},</p><p>Booking {{bookingNo}} has been cancelled.</p>",
  },
  staff_invite: {
    subject: "You have been invited to {{storeName}}",
    bodyHtml: "<p>{{inviterName}} invited you to help run {{storeName}}.</p><p>{{inviteUrl}}</p>",
  },
};

async function loadBrand(tenantId?: string) {
  if (!tenantId) {
    return { storeName: "Rentora", primaryColor: "#0F766E", logoUrl: null, supportEmail: null };
  }

  const store = await prisma.store.findFirst({
    where: { tenantId },
    select: {
      name: true,
      logoUrl: true,
      supportEmail: true,
      brandColors: true,
    },
  });

  const colors = (store?.brandColors ?? {}) as Record<string, string>;

  return {
    storeName: store?.name ?? "Rentora",
    primaryColor: colors.primary ?? "#0F766E",
    logoUrl: store?.logoUrl ?? null,
    supportEmail: store?.supportEmail ?? null,
  };
}

async function loadTemplate(tenantId: string | undefined, key: string, locale: string) {
  if (tenantId) {
    const row =
      (await prisma.emailTemplate.findUnique({
        where: { tenantId_key_locale: { tenantId, key, locale } },
      })) ??
      // Fall back to the tenant's English copy before falling back to ours.
      (await prisma.emailTemplate.findFirst({ where: { tenantId, key, isActive: true } }));

    if (row?.isActive) {
      return { subject: row.subject, bodyHtml: row.bodyHtml, source: "tenant" as const };
    }
  }

  const fallback = FALLBACK_TEMPLATES[key];
  if (!fallback) return null;
  return { ...fallback, source: "builtin" as const };
}

export async function processEmail(job: Job<EmailJobData>): Promise<SendResult> {
  const { to, tenantId, template, locale = "en", vars = {}, subject: overrideSubject } = job.data;

  if (!to?.includes("@")) {
    // A malformed address will never succeed, so fail permanently rather than retrying.
    throw new UnrecoverableEmailError(`Refusing to send to an invalid address: ${to}`);
  }

  const brand = await loadBrand(tenantId);
  const templateVars: TemplateVars = { storeName: brand.storeName, ...vars };

  let subject: string;
  let bodyHtml: string;

  if (job.data.html) {
    subject = overrideSubject ?? "";
    bodyHtml = job.data.html;
  } else if (template) {
    const loaded = await loadTemplate(tenantId, template, locale);
    if (!loaded) {
      throw new UnrecoverableEmailError(`No template named ${template}`);
    }
    subject = interpolate(overrideSubject ?? loaded.subject, templateVars);
    bodyHtml = interpolate(loaded.bodyHtml, templateVars);
  } else {
    throw new UnrecoverableEmailError("Job has neither a template nor html");
  }

  const html = wrapInLayout(bodyHtml, subject, brand);

  const result = await sendEmail({
    to,
    subject,
    html,
    text: toPlainText(html),
    from: process.env.EMAIL_FROM ?? `${brand.storeName} <bookings@alarent.app>`,
    replyTo: brand.supportEmail,
  });

  console.log(
    `[email] job=${job.id} to=${to} template=${template ?? "inline"} delivered=${result.delivered}` +
      (result.reason ? ` reason=${result.reason}` : ""),
  );

  return result;
}

/** BullMQ treats this as final: no retries, straight to the failed set. */
export class UnrecoverableEmailError extends Error {
  readonly name = "UnrecoverableError";
}
