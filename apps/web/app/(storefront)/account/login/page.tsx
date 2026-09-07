import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { AuthForm, type AuthField } from "@/components/auth-form";
import { customerLoginAction } from "@/lib/auth-actions";
import { getSession } from "@/lib/session";
import { getBootstrap } from "@/lib/tenant";

export const metadata = { title: "Log in" };

const fields: AuthField[] = [
  {
    name: "email",
    label: "Email",
    type: "email",
    required: true,
    autoComplete: "username",
    placeholder: "you@example.com",
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    required: true,
    autoComplete: "current-password",
  },
];

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  if ((await getSession())?.role === "customer") {
    redirect(next?.startsWith("/") ? next : "/account/dashboard");
  }

  const bootstrap = await getBootstrap();

  return (
    <AuthCard
      eyebrow={bootstrap?.store.name}
      title="Log in"
      description="See your bookings, invoices, and rental dates."
      footer={
        <span>
          No account yet?{" "}
          <Link
            href="/account/register"
            className="font-medium text-[var(--color-primary)] hover:underline"
          >
            Create one
          </Link>
        </span>
      }
    >
      <AuthForm action={customerLoginAction} fields={fields} submitLabel="Log in" next={next} />
    </AuthCard>
  );
}
