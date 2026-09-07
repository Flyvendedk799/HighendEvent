import Link from "next/link";

export function StorefrontFooter({
  storeName,
  tagline,
  supportEmail,
  supportPhone,
  pages,
}: {
  storeName: string;
  tagline?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  pages: Array<{ slug: string; title: string }>;
}) {
  return (
    <footer className="border-t border-[var(--color-border)]/70 bg-[var(--color-surface)]/60">
      <div className="mx-auto flex max-w-6xl flex-wrap gap-8 px-4 py-10 sm:px-6">
        <div className="min-w-[220px] flex-1">
          <p className="font-display text-lg font-semibold">{storeName}</p>
          {tagline ? (
            <p className="mt-1 max-w-sm text-sm text-[var(--color-muted-foreground)]">{tagline}</p>
          ) : null}
        </div>

        {pages.length > 0 ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Information
            </p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {pages.map((page) => (
                <li key={page.slug}>
                  <Link href={`/pages/${page.slug}`} className="hover:underline">
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {supportEmail || supportPhone ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Contact
            </p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {supportEmail ? (
                <li>
                  <a href={`mailto:${supportEmail}`} className="hover:underline">
                    {supportEmail}
                  </a>
                </li>
              ) : null}
              {supportPhone ? (
                <li>
                  <a href={`tel:${supportPhone.replace(/\s/g, "")}`} className="hover:underline">
                    {supportPhone}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="border-t border-[var(--color-border)]/60 px-4 py-4 text-center text-xs text-[var(--color-muted-foreground)] sm:px-6">
        &copy; {new Date().getFullYear()} {storeName}
      </div>
    </footer>
  );
}
