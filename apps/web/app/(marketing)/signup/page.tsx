import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@rentora/ui";
import { SignupForm } from "@/components/marketing/signup-form";
import { getSession } from "@/lib/session";
import { platformDomain } from "@/lib/platform";

export const metadata = {
  title: "Start your store",
  description: "Create an alarent storefront and start taking bookings.",
};

const PROOF = [
  "A branded storefront on your own address",
  "A calendar that knows what is actually free",
  "Card payments straight into your own Stripe account",
  "Deposits now, balance before the dates",
];

export default async function SignupPage() {
  // Already signed in as staff? There is nothing to sign up for.
  if ((await getSession())?.role === "staff") {
    redirect("/admin");
  }

  const platform = platformDomain();

  return (
    <main className="mx-auto grid max-w-measure items-start gap-12 px-gutter pb-24 pt-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div>
        <h1 className="text-[clamp(34px,5.2vw,58px)] font-semibold leading-[0.94] tracking-[-0.04em]">
          Start taking bookings this week
        </h1>
        <p className="mt-5 max-w-[46ch] text-[16.5px] leading-relaxed text-paper-dim">
          alarent is built for the awkward parts of hire: turnaround days, deposits, delivery
          distance, and a calendar that has to be right.
        </p>

        <ul className="mt-9 space-y-3.5">
          {PROOF.map((item) => (
            <li key={item} className="flex items-start gap-3 text-[14px] text-paper-dim">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-signal text-signal-ink">
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="m5 10 3.5 3.5L15 6"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              {item}
            </li>
          ))}
        </ul>

        <p className="mt-12 font-mono text-[10.5px] uppercase tracking-[0.14em] text-paper-faint">
          Already running a store?{" "}
          <Link href="/admin/login" className="text-signal transition-colors duration-instant hover:text-paper">
            Sign in
          </Link>
        </p>
      </div>

      <Card className="h-fit border-line-raised p-6 lg:sticky lg:top-24">
        <SignupForm platformDomain={platform} />
      </Card>
    </main>
  );
}
