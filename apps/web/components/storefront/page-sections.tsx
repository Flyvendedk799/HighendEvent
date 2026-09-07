import Link from "next/link";

/**
 * CMS pages are stored as an ordered list of typed blocks rather than raw HTML.
 *
 * Blocks keep tenant content inside the theme, and mean nothing a tenant types can inject
 * markup into their own storefront. An unknown block type renders nothing rather than breaking
 * the page.
 */
export type Section =
  | { type: "richText"; heading?: string; body: string }
  | { type: "faq"; heading?: string; items: Array<{ q: string; a: string }> }
  | { type: "callout"; heading?: string; body: string; ctaLabel?: string; ctaHref?: string }
  | { type: "list"; heading?: string; items: string[] };

export const SECTION_TYPES = ["richText", "faq", "callout", "list"] as const;

export function PageSections({ sections }: { sections: Section[] }) {
  return (
    <div className="space-y-10">
      {sections.map((section, index) => (
        <SectionBlock key={index} section={section} />
      ))}
    </div>
  );
}

function SectionBlock({ section }: { section: Section }) {
  switch (section.type) {
    case "richText":
      return (
        <section>
          {section.heading ? (
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {section.heading}
            </h2>
          ) : null}
          <div className="mt-3 max-w-2xl space-y-3 leading-relaxed">
            {section.body.split(/\n{2,}/).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </section>
      );

    case "faq":
      return (
        <section>
          {section.heading ? (
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {section.heading}
            </h2>
          ) : null}
          <dl className="mt-4 max-w-2xl divide-y divide-[var(--color-border)]">
            {section.items.map((item, i) => (
              <div key={i} className="py-4 first:pt-0">
                <dt className="font-medium">{item.q}</dt>
                <dd className="mt-1 text-[var(--color-muted-foreground)]">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      );

    case "list":
      return (
        <section>
          {section.heading ? (
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {section.heading}
            </h2>
          ) : null}
          <ul className="mt-3 max-w-2xl list-disc space-y-1.5 pl-5">
            {section.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      );

    case "callout":
      return (
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          {section.heading ? (
            <h2 className="font-display text-xl font-semibold tracking-tight">
              {section.heading}
            </h2>
          ) : null}
          <p className="mt-2 max-w-2xl text-[var(--color-muted-foreground)]">{section.body}</p>
          {section.ctaLabel && section.ctaHref?.startsWith("/") ? (
            <Link
              href={section.ctaHref}
              className="mt-4 inline-block rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
            >
              {section.ctaLabel}
            </Link>
          ) : null}
        </section>
      );

    default:
      return null;
  }
}
