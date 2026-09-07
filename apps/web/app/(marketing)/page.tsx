import Link from "next/link";
import { Button, formatMoneyMinor } from "@rentora/ui";
import { apiFetch } from "@/lib/api";

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
    plan.customDomains ? "Your own domain" : "Free rentora.app address",
    plan.apiAccess ? "API and outbound webhooks" : "Stripe payouts and email",
    `${(plan.applicationFeeBps / 100).toFixed(2)}% booking fee`,
  ];
}

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const plans = await apiFetch<Plan[]>("/billing/plans", {
    method: "GET",
    next: { revalidate: 300 },
  }).catch(() => [] as Plan[]);

  return (
    <main>
      <section className="relative min-h-[100svh] overflow-hidden bg-hero-glow text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-32 h-72 w-72 animate-float rounded-full bg-teal-400/20 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-80 w-80 animate-float rounded-full bg-amber-400/15 blur-3xl [animation-delay:1.2s]" />
          <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:48px_48px]" />
        </div>

        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-6 pb-20 pt-28">
          <p className="animate-fade-up font-display text-5xl font-semibold tracking-tight text-white sm:text-7xl md:text-8xl">
            Rentora
          </p>
          <h1 className="animate-fade-up mt-6 max-w-2xl text-balance text-2xl font-medium text-teal-50/95 sm:text-3xl [animation-delay:120ms]">
            The rental CMS that turns inventory into bookings.
          </h1>
          <p className="animate-fade-up mt-4 max-w-xl text-base text-teal-100/75 sm:text-lg [animation-delay:220ms]">
            Launch a branded storefront, manage availability, and collect payments — built for
            party hire, AV, and event equipment businesses.
          </p>
          <div className="animate-fade-up mt-8 flex flex-wrap gap-3 [animation-delay:320ms]">
            <Link href="/signup">
              <Button size="lg" className="bg-amber-400 text-slate-950 hover:bg-amber-300">
                Start your store
              </Button>
            </Link>
            <a href="#product">
              <Button
                size="lg"
                variant="secondary"
                className="border-white/20 bg-white/10 text-white hover:bg-white/15"
              >
                See how it works
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section id="product" className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl font-semibold tracking-tight text-slate-900">
            One platform for every rental brand
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            Host marketing for Rentora, tenant storefronts, and admin tools — resolved from the
            hostname you already own.
          </p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Branded storefront",
              body: "Catalog, availability calendar, cart, and checkout styled with tenant theme tokens.",
            },
            {
              title: "Ops console",
              body: "Manual bookings, delivery zones, CMS pages, staff roles, and go-live checklists.",
            },
            {
              title: "Platform control",
              body: "Tenants, plans, Stripe billing overview, and feature flags for gradual rollouts.",
            },
          ].map((item, index) => (
            <article
              key={item.title}
              className="animate-fade-up rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="mb-4 h-1.5 w-12 rounded-full bg-gradient-to-r from-teal-600 to-amber-400" />
              <h3 className="font-display text-xl font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="customers" className="border-y border-slate-200 bg-slate-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl font-semibold">Trusted by growing hire brands</h2>
          <p className="mt-3 max-w-xl text-slate-300">
            From boutique party rentals to multi-warehouse fleets, Rentora keeps inventory, calendar,
            and payments in sync.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {["Nordic Party Co.", "Lumen AV Hire", "Garden Event Rentals"].map((name) => (
              <div
                key={name}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-6 font-display text-xl"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <h2 className="font-display text-4xl font-semibold text-slate-900">Simple plans</h2>
          <p className="mt-2 text-slate-600">Grow from first booking to multi-location ops.</p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            // The middle tier is the one most rental businesses land on, so it leads.
            const featured = plan.tier === "GROWTH";

            return (
            <div
              key={plan.tier}
              className={`rounded-2xl border p-6 ${
                featured
                  ? "border-teal-600 bg-teal-900 text-white shadow-xl shadow-teal-900/20"
                  : "border-slate-200 bg-white"
              }`}
            >
              <h3 className="font-display text-2xl font-semibold">{plan.name}</h3>
              <p className={`mt-1 text-sm ${featured ? "text-teal-100" : "text-slate-500"}`}>
                {PLAN_BLURB[plan.tier]}
              </p>
              <p className="mt-6 font-display text-4xl font-semibold">
                {formatMoneyMinor(plan.priceMinor, plan.currency)}
                <span className="text-base font-sans font-normal opacity-70"> / mo</span>
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                {featuresOf(plan).map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className={featured ? "text-amber-300" : "text-teal-700"}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={`mt-8 w-full ${
                  featured
                    ? "bg-amber-400 text-slate-950 hover:bg-amber-300"
                    : "bg-teal-700 hover:bg-teal-600"
                }`}
              >
                <Link href={`/signup?plan=${plan.tier}`}>Choose {plan.name}</Link>
              </Button>
            </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-sm text-slate-500">
          <span className="font-display text-lg text-slate-800">Rentora</span>
          <p>© {new Date().getFullYear()} Rentora. Multi-tenant rental CMS.</p>
        </div>
      </footer>
    </main>
  );
}
