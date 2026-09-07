export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: string;
  replyTo?: string | null;
};

export type SendResult = {
  delivered: boolean;
  provider: "resend" | "console";
  id?: string;
  reason?: string;
};

function resendKey(): string | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith("re_xxx")) return null;
  return key;
}

export function emailProviderStatus() {
  const configured = resendKey() !== null;
  return {
    configured,
    provider: configured ? ("resend" as const) : ("console" as const),
    defaultFrom: process.env.EMAIL_FROM ?? "Rentora <bookings@alarent.app>",
    reason: configured
      ? null
      : "RESEND_API_KEY is not set. Emails are logged instead of sent.",
  };
}

/**
 * Sends through Resend when it is configured, and otherwise logs the message.
 *
 * The fallback deliberately reports `delivered: false` rather than pretending: a tenant
 * checking whether their customer was emailed must get a truthful answer.
 */
export async function sendEmail(email: OutgoingEmail): Promise<SendResult> {
  const key = resendKey();

  if (!key) {
    console.log(
      `[email] NOT SENT (no provider configured) to=${email.to} subject=${JSON.stringify(email.subject)}`,
    );
    return {
      delivered: false,
      provider: "console",
      reason: "RESEND_API_KEY is not set",
    };
  }

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
