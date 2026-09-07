import Link from "next/link";
import { formatMoneyMinor } from "@rentora/ui";
import { HeroBoard } from "@/components/marketing/hero-board";
import { Reveal } from "@/components/marketing/reveal";
import { apiFetch } from "@/lib/api";
import { platformDomain } from "@/lib/platform";

type Plan = {
  tier: "STARTER" | "GROWTH" | "SCALE";
  name: string;
  priceMinor: number;
  currency: string;
  maxProducts: number | null;
  maxStaff: number | null;
  customDomains: boolean;
  apiAccess: boolean;
  applicationFeeBps: number;
};

const PLAN_BLURB: Record<string, string> = {
  STARTER: "Solo shops taking their first online bookings",
  GROWTH: "Busy rental teams with delivery and a crew",
  SCALE: "Multi-location fleets and agencies",
};

/**
 * Marketing copy is derived from the plan limits the API actually enforces, so the pricing
 * table cannot drift away from what a customer gets.
 */
function featuresOf(plan: Plan): string[] {
  return [
    plan.maxProducts === null ? "Unlimited products" : `Up to ${plan.maxProducts} products`,
    plan.maxStaff === null ? "Unlimited staff seats" : `${plan.maxStaff} staff seats`,
    plan.customDomains ? "Your own domain" : `Free ${platformDomain()} address`,
    plan.apiAccess ? "API and outbound webhooks" : "Stripe payouts and email",
    `${(plan.applicationFeeBps / 100).toFixed(2)}% booking fee`,
  ];
}

const SURFACES = [
  {
    no: "01",
    cta: "Storefront →",
    href: "/signup",
    title: "A shop that knows its stock",
    body: "Branded catalogue, live availability, delivery quote and checkout. Customers see the same occupancy the warehouse does.",
    tags: ["Catalogue", "Calendar", "Checkout"],
  },
  {
    no: "02",
    cta: "Console →",
    href: "/admin",
    title: "An ops console, not a dashboard",
    body: "Today's outbound, returns due, unpaid holds. Dense tables, allowed status transitions, no decorative charts.",
    tags: ["Bookings", "Crew", "Payouts"],
  },
  {
    no: "03",
    cta: "Platform →",
    href: "/platform",
    title: "A control plane for many shops",
    body: "Tenants, plans, Stripe billing overview and feature flags, so a rollout reaches one shop before it reaches all of them.",
    tags: ["Tenants", "Plans", "Flags"],
  },
];

const FLOW = [
  {
    step: "01",
    title: "Date picked",
    body: "Availability is computed from stock, live bookings and each item's prep and cleanup buffer — not a static calendar.",
  },
  {
    step: "02",
    title: "Quote held",
    body: "Weekday, weekend and package pricing, plus a delivery fee derived from the real distance to the address.",
  },
  {
    step: "03",
    title: "Paid",
    body: "Stripe Connect takes the deposit or the full amount into the tenant's own account. The hold becomes a booking.",
  },
  {
    step: "04",
    title: "On the board",
    body: "The bar appears in the console the moment the webhook lands, and in the crew's calendar feed on the next sync.",
  },
  {
    step: "05",
    title: "Returned",
    body: "Marked back in, the buffer runs, stock frees itself. Damage notes and deposit refunds attach to the booking.",
  },
];

/**
 * The proof strip. Every line here is a property of the system rather than a metric from a
 * customer we cannot name — the design system's own rule is that a number without a source is
 * decoration, and a marketing page is not exempt from it.
 */
const PROOF = [
  { value: "3", label: "Surfaces on one dataset: storefront, console, platform" },
  { value: "0", label: "Double bookings — availability is computed, never stored" },
  { value: "2", label: "Buffers per item: prep before, cleanup after" },
  { value: "1", label: "Board the shopper and the warehouse both read" },
];

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const plans = await apiFetch<Plan[]>("/billing/plans", {
    method: "GET",
    next: { revalidate: 300 },
  }).catch(() => [] as Plan[]);

  return (
    <main>
      <HeroBoard />

      {/* Proof */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-measure px-gutter">
          <div className="grid gap-px border-x border-line bg-line [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
            {PROOF.map((stat) => (
              <div key={stat.label} className="bg-ink px-6 py-8">
                <p className="font-mono text-[34px] font-medium leading-none tracking-[-0.03em] tabular-nums">
                  {stat.value}
                </p>
                <p className="mt-3 text-[12.5px] leading-snug text-paper-mute">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Three surfaces */}
      <section id="surfaces" className="mx-auto max-w-measure scroll-mt-20 px-gutter pt-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
          02 — three surfaces, one truth
        </p>
        <h2 className="mt-5 max-w-[18ch] text-[clamp(32px,4.6vw,58px)] font-semibold leading-none tracking-[-0.035em]">
          Storefront, console, platform.
        </h2>

        <div className="mt-11 grid gap-px border border-line bg-line [grid-template-columns:repeat(auto-fit,minmax(272px,1fr))]">
          {SURFACES.map((surface, i) => (
            <Link
              key={surface.no}
              href={surface.href}
              className="group flex min-h-[250px] flex-col gap-3.5 bg-ink-raised p-6 transition-colors duration-instant hover:bg-ink-hover"
            >
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-paper-mute">
                <span>{surface.no}</span>
                <span className="text-signal">{surface.cta}</span>
              </div>
              <h3 className="mt-3.5 text-[23px] font-semibold tracking-[-0.025em]">
                {surface.title}
              </h3>
              <p className="text-[14px] leading-relaxed text-paper-dim">{surface.body}</p>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                {surface.tags.map((tag) => (
                  <span
                    key={tag}
                    className="border border-line-strong px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-paper-mute"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <span className="sr-only">{`Surface ${i + 1}`}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* How a booking moves */}
      <section id="flow" className="mx-auto max-w-measure scroll-mt-20 px-gutter pt-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
          03 — how a booking moves
        </p>
        <div className="mt-9 grid gap-px border border-line bg-line [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
          {FLOW.map((step, i) => (
            <Reveal key={step.step} delayMs={i * 80} className="bg-ink px-5 py-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-signal">
                {step.step}
              </p>
              <p className="mt-3.5 text-[17px] font-semibold tracking-[-0.02em]">{step.title}</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-paper-mute">{step.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Pricing */}
      {plans.length > 0 ? (
        <section id="pricing" className="mx-auto max-w-measure scroll-mt-20 px-gutter pt-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
            04 — what it costs
          </p>
          <h2 className="mt-5 max-w-[16ch] text-[clamp(32px,4.6vw,58px)] font-semibold leading-none tracking-[-0.035em]">
            One price, one fee.
          </h2>

          <div className="mt-11 grid gap-px border border-line bg-line lg:grid-cols-3">
            {plans.map((plan) => {
              // The middle tier is the one most rental businesses land on, so it leads.
              const featured = plan.tier === "GROWTH";

              return (
                <div
                  key={plan.tier}
                  className={
                    featured
                      ? "flex flex-col bg-ink-raised p-7 outline outline-1 -outline-offset-1 outline-signal"
                      : "flex flex-col bg-ink-raised p-7"
                  }
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[19px] font-semibold tracking-[-0.02em]">{plan.name}</h3>
                    {featured ? (
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-signal">
                        Most shops
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-paper-mute">
                    {PLAN_BLURB[plan.tier]}
                  </p>

                  <p className="mt-7 font-mono text-[38px] font-medium leading-none tracking-[-0.04em] tabular-nums">
                    {formatMoneyMinor(plan.priceMinor, plan.currency)}
                    <span className="text-[15px] text-paper-mute"> / mo</span>
                  </p>

                  <ul className="mt-7 space-y-2.5 text-[13.5px] text-paper-dim">
                    {featuresOf(plan).map((feature) => (
                      <li key={feature} className="flex gap-2.5">
                        <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-signal" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/signup?plan=${plan.tier}`}
                    className={
                      featured
                        ? "mt-8 block bg-signal py-3.5 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-signal-ink transition-colors duration-instant hover:bg-signal-press"
                        : "mt-8 block border border-line-strong py-3.5 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-paper transition-colors duration-instant hover:border-signal hover:text-signal"
                    }
                  >
                    Choose {plan.name}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section className="mx-auto mt-24 max-w-measure px-gutter">
        <div className="flex flex-wrap items-end justify-between gap-8 border border-line-raised bg-gradient-to-b from-ink-raised to-ink p-[clamp(34px,6vw,72px)]">
          <div>
            <h2 className="max-w-[16ch] text-[clamp(30px,5vw,58px)] font-semibold leading-none tracking-[-0.04em]">
              Put your fleet on the board.
            </h2>
            <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-paper-dim">
              Import your inventory, set prep and cleanup buffers, connect payouts. Live the same
              week.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/signup"
              className="bg-signal px-6 py-4 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-signal-ink transition-colors duration-instant hover:bg-signal-press"
            >
              Start free →
            </Link>
            <Link
              href="/admin"
              className="border border-line-strong px-6 py-4 font-mono text-[12px] uppercase tracking-[0.14em] text-paper transition-colors duration-instant hover:border-signal hover:text-signal"
            >
              See the console
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto mt-20 max-w-measure px-gutter pb-16">
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 font-mono text-[10.5px] uppercase tracking-[0.14em] text-paper-faint">
          <span>alarent — rental operating system</span>
          <div className="flex flex-wrap gap-5">
            <Link href="/signup" className="transition-colors duration-instant hover:text-signal">
              Start
            </Link>
            <Link href="/admin" className="transition-colors duration-instant hover:text-signal">
              Console
            </Link>
            <Link href="/platform" className="transition-colors duration-instant hover:text-signal">
              Platform
            </Link>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
