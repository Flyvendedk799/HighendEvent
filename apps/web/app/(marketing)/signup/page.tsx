import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@rentora/ui";
import { SignupForm } from "@/components/marketing/signup-form";
import { getSession } from "@/lib/session";
import { platformDomain } from "@/lib/platform";

export const metadata = {
  title: "Start your store",
  description: "Create a Rentora storefront and start taking bookings.",
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
    <main className="mx-auto grid max-w-5xl gap-10 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:py-24">
      <div>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Start taking bookings this week
        </h1>
        <p className="mt-4 max-w-lg text-lg text-[var(--color-muted-foreground)]">
          Rentora is built for the awkward parts of hire: turnaround days, deposits, delivery
          distance, and a calendar that has to be right.
        </p>

        <ul className="mt-8 space-y-3">
          {PROOF.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
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

        <p className="mt-10 text-sm text-[var(--color-muted-foreground)]">
          Already running a store?{" "}
          <Link href="/admin/login" className="font-medium text-[var(--color-primary)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <Card className="h-fit p-6">
        <SignupForm platformDomain={platform} />
      </Card>
    </main>
  );
}
