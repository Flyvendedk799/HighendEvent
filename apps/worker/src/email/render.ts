export type TemplateVars = Record<string, string | number | null | undefined>;

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Fills {{placeholders}} in a template.
 *
 * Values are HTML-escaped, so a customer whose name contains markup cannot inject it into an
 * email that other people read. A placeholder with no value renders empty rather than leaving
 * the raw {{token}} visible to the recipient.
 */
export function interpolate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_match, key: string) => {
    const value = vars[key];
    if (value === null || value === undefined || value === "") return "";
    return escapeHtml(String(value));
  });
}

/** Placeholders a template references, so the admin preview can list what it needs. */
export function placeholdersIn(template: string): string[] {
  const found = new Set<string>();
  for (const match of template.matchAll(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g)) {
    if (match[1]) found.add(match[1]);
  }
  return [...found];
}

export type BrandOptions = {
  storeName: string;
  primaryColor?: string;
  logoUrl?: string | null;
  supportEmail?: string | null;
  footerNote?: string | null;
};

/**
 * Wraps template body HTML in a tenant-branded shell.
 *
 * Table-based and inline-styled on purpose: email clients do not reliably support modern CSS,
 * and a rental confirmation has to render in Outlook.
 */
export function wrapInLayout(
  bodyHtml: string,
  subject: string,
  brand: BrandOptions,
): string {
  const primary = /^#[0-9a-fA-F]{3,8}$/.test(brand.primaryColor ?? "")
    ? brand.primaryColor!
    : "#0F766E";

  const header = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.storeName)}" style="max-height:36px;max-width:180px;display:block;" />`
    : `<span style="font-size:18px;font-weight:600;color:${primary};">${escapeHtml(brand.storeName)}</span>`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 32px 0;">${header}</td>
            </tr>
            <tr>
              <td style="padding:20px 32px 32px;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
            <tr>
              <td style="padding:16px 32px;font-size:12px;color:#64748b;text-align:center;">
                ${escapeHtml(brand.storeName)}${
                  brand.supportEmail
                    ? ` &middot; <a href="mailto:${escapeHtml(brand.supportEmail)}" style="color:#64748b;">${escapeHtml(brand.supportEmail)}</a>`
                    : ""
                }
                ${brand.footerNote ? `<br />${escapeHtml(brand.footerNote)}` : ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Plain-text alternative, so the message is not spam-flagged for being HTML-only. */
export function toPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h1|h2|h3|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
