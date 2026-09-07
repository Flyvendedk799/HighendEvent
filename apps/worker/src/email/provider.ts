import nodemailer, { type Transporter } from "nodemailer";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: string;
  replyTo?: string | null;
};

export type EmailProvider = "resend" | "smtp" | "console";

export type SendResult = {
  delivered: boolean;
  provider: EmailProvider;
  id?: string;
  reason?: string;
};

function resendKey(): string | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith("re_xxx")) return null;
  return key;
}

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
};

/**
 * The SMTP relay, from the environment the host injects.
 *
 * These are the variable names ServerHoster's "Enable email" writes into every
 * service in a project (SMTP_HOST/PORT/USER/PASSWORD, SMTP_FROM,
 * SMTP_FROM_NAME). Reading them here is what makes that switch actually do
 * something for Rentora — before this, the env was injected and nothing on the
 * send path looked at it, so signup and booking mail went nowhere while the
 * platform reported success.
 *
 * A host alone is enough: an unauthenticated relay is a legitimate setup, so
 * user/pass are optional rather than required.
 */
function smtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT ?? 465) || 465;
  return {
    host,
    port,
    // 465 is implicit TLS; 587 and 25 start plaintext and upgrade via STARTTLS.
    // Getting this backwards fails at the handshake with a confusing error.
    secure: port === 465,
    user: process.env.SMTP_USER?.trim() || undefined,
    pass: process.env.SMTP_PASSWORD?.trim() || undefined,
  };
}

/**
 * The default From, preferring what the host injected.
 *
 * EMAIL_FROM stays first so an existing deployment that set it keeps its
 * behaviour; SMTP_FROM/SMTP_FROM_NAME are what the platform's email tab writes.
 */
export function defaultFrom(storeName = "Rentora"): string {
  const explicit = process.env.EMAIL_FROM?.trim();
  if (explicit) return explicit;

  const address = process.env.SMTP_FROM?.trim();
  if (address) {
    const name = process.env.SMTP_FROM_NAME?.trim() || storeName;
    return `${name} <${address}>`;
  }
  return `${storeName} <bookings@alarent.app>`;
}

let transporter: Transporter | null = null;

function smtpTransport(config: SmtpConfig): Transporter {
  // Reused across jobs: a new connection per email would re-do the TLS
  // handshake every time and trip most relays' rate limits.
  transporter ??= nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.user && config.pass ? { auth: { user: config.user, pass: config.pass } } : {}),
  });
  return transporter;
}

export function emailProviderStatus() {
  const smtp = smtpConfig();
  const provider: EmailProvider = resendKey() ? "resend" : smtp ? "smtp" : "console";

  return {
    configured: provider !== "console",
    provider,
    defaultFrom: defaultFrom(),
    reason:
      provider !== "console"
        ? null
        : "Neither RESEND_API_KEY nor SMTP_HOST is set. Emails are logged instead of sent.",
  };
}

/**
 * Sends through whichever transport is configured, and otherwise logs the message.
 *
 * Resend wins when its key is present because setting it is an explicit choice;
 * SMTP is the fallback the host provides for every project. The console path
 * deliberately reports `delivered: false` rather than pretending: a tenant
 * checking whether their customer was emailed must get a truthful answer.
 */
export async function sendEmail(email: OutgoingEmail): Promise<SendResult> {
  const key = resendKey();
  if (key) return sendViaResend(email, key);

  const smtp = smtpConfig();
  if (smtp) return sendViaSmtp(email, smtp);

  console.log(
    `[email] NOT SENT (no provider configured) to=${email.to} subject=${JSON.stringify(email.subject)}`,
  );
  return {
    delivered: false,
    provider: "console",
    reason: "Neither RESEND_API_KEY nor SMTP_HOST is set",
  };
}

async function sendViaResend(email: OutgoingEmail, key: string): Promise<SendResult> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: email.from,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(email.replyTo ? { reply_to: email.replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    // Throwing lets BullMQ retry with backoff rather than dropping the message.
    throw new Error(`Resend rejected the message (${response.status}): ${detail.slice(0, 300)}`);
  }

  const body = (await response.json()) as { id?: string };
  return { delivered: true, provider: "resend", id: body.id };
}

async function sendViaSmtp(email: OutgoingEmail, config: SmtpConfig): Promise<SendResult> {
  // Thrown errors are what tell BullMQ to retry, so nothing is swallowed here.
  // A relay that refuses the sender (Cloudflare answers 550 for a domain it has
  // not been told to send for) surfaces as a failed job with the relay's own
  // wording, which is the only useful thing to put in front of an operator.
  const info = await smtpTransport(config).sendMail({
    from: email.from,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    ...(email.replyTo ? { replyTo: email.replyTo } : {}),
  });

  return { delivered: true, provider: "smtp", id: info.messageId };
}
