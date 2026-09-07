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
    <div className="space-y-12">
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
            <h2 className="text-[26px] font-semibold tracking-[-0.025em]">
              {section.heading}
            </h2>
          ) : null}
          <div className="mt-4 max-w-[62ch] space-y-4 text-[15px] leading-relaxed text-paper-dim">
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
            <h2 className="text-[26px] font-semibold tracking-[-0.025em]">
              {section.heading}
            </h2>
          ) : null}
          <dl className="mt-5 max-w-[62ch] divide-y divide-line-soft border-y border-line-soft">
            {section.items.map((item, i) => (
              <div key={i} className="py-4 first:pt-0">
                <dt className="text-[15px] text-paper">{item.q}</dt>
                <dd className="mt-2 text-[13.5px] leading-relaxed text-paper-mute">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      );

    case "list":
      return (
        <section>
          {section.heading ? (
            <h2 className="text-[26px] font-semibold tracking-[-0.025em]">
              {section.heading}
            </h2>
          ) : null}
          <ul className="mt-4 max-w-[62ch] space-y-2.5 text-[14px] text-paper-dim">
            {section.items.map((item, i) => (
              <li key={i} className="flex gap-3">
                <span aria-hidden="true" className="mt-[9px] h-1 w-1 shrink-0 bg-signal" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      );

    case "callout":
      return (
        <section className="border border-line-raised bg-ink-raised p-6">
          {section.heading ? (
            <h2 className="text-[19px] font-semibold tracking-[-0.02em]">
              {section.heading}
            </h2>
          ) : null}
          <p className="mt-3 max-w-[58ch] text-[14px] leading-relaxed text-paper-dim">{section.body}</p>
          {section.ctaLabel && section.ctaHref?.startsWith("/") ? (
            <Link
              href={section.ctaHref}
              className="mt-4 inline-block bg-signal px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-signal-ink transition-colors duration-instant hover:bg-signal-press"
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
