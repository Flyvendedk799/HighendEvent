import Link from "next/link";
import type { Dictionary } from "@/lib/i18n";

export function StorefrontFooter({
  storeName,
  tagline,
  supportEmail,
  supportPhone,
  pages,
  t,
}: {
  storeName: string;
  tagline?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  pages: Array<{ slug: string; title: string }>;
  t: Dictionary;
}) {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-measure flex-wrap gap-10 px-5 py-12 md:px-gutter">
        <div className="min-w-[220px] flex-1">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em]">
            {storeName}
          </p>
          {tagline ? (
            <p className="mt-3 max-w-[42ch] text-[13.5px] leading-relaxed text-paper-mute">
              {tagline}
            </p>
          ) : null}
        </div>

        {pages.length > 0 ? (
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper-faint">
              {t.common.information}
            </p>
            <ul className="mt-3 space-y-2 text-[13.5px] text-paper-dim">
              {pages.map((page) => (
                <li key={page.slug}>
                  <Link
                    href={`/pages/${page.slug}`}
                    className="transition-colors duration-instant hover:text-signal"
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {supportEmail || supportPhone ? (
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper-faint">
              {t.common.contact}
            </p>
            <ul className="mt-3 space-y-2 font-mono text-[12.5px] text-paper-dim">
              {supportEmail ? (
                <li>
                  <a
                    href={`mailto:${supportEmail}`}
                    className="transition-colors duration-instant hover:text-signal"
                  >
                    {supportEmail}
                  </a>
                </li>
              ) : null}
              {supportPhone ? (
                <li>
                  <a
                    href={`tel:${supportPhone.replace(/\s/g, "")}`}
                    className="transition-colors duration-instant hover:text-signal"
                  >
                    {supportPhone}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="border-t border-line-soft px-5 py-5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-paper-faint md:px-gutter">
        © {new Date().getFullYear()} {storeName}
      </div>
    </footer>
  );
}
