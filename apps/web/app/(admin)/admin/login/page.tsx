import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { AuthForm, type AuthField } from "@/components/auth-form";
import { staffLoginAction } from "@/lib/auth-actions";
import { getSession } from "@/lib/session";
import { getTenantSlug } from "@/lib/tenant";

export const metadata = { title: "Staff login" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  if ((await getSession())?.role === "staff") {
    redirect(next?.startsWith("/") ? next : "/admin");
  }

  // On a tenant subdomain or custom domain the store is already known, so we do not ask.
  const tenantSlug = await getTenantSlug();

  const fields: AuthField[] = [
    {
      name: "email",
      label: "Work email",
      type: "email",
      required: true,
      autoComplete: "username",
      placeholder: "you@yourstore.com",
    },
    {
      name: "password",
      label: "Password",
      type: "password",
      required: true,
      autoComplete: "current-password",
    },
  ];

  if (!tenantSlug) {
    fields.push({
      name: "tenantSlug",
      label: "Store address",
      required: true,
      placeholder: "demo",
      hint: "The part before .rentora.app in your storefront address.",
    });
  }

  return (
    <AuthCard
      eyebrow="Rentora"
      title="Sign in to your console"
      description="Manage bookings, inventory, and your storefront."
      footer={
        <span>
          Renting from this store instead?{" "}
          <a className="font-medium text-[var(--color-primary)] hover:underline" href="/account/login">
            Customer login
          </a>
        </span>
      }
    >
      <AuthForm
        action={staffLoginAction}
        fields={fields}
        submitLabel="Sign in"
        next={next}
      />
    </AuthCard>
  );
}
