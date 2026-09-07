import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { AuthForm, type AuthField } from "@/components/auth-form";
import { platformLoginAction } from "@/lib/auth-actions";
import { getSession } from "@/lib/session";

export const metadata = { title: "Platform login" };

const fields: AuthField[] = [
  {
    name: "email",
    label: "Email",
    type: "email",
    required: true,
    autoComplete: "username",
    placeholder: "ops@alarent.app",
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    required: true,
    autoComplete: "current-password",
  },
];

export default async function PlatformLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  if ((await getSession())?.role === "platform") {
    redirect(next?.startsWith("/") ? next : "/platform");
  }

  return (
    <AuthCard
      eyebrow="alarent platform"
      title="Operator sign in"
      description="Tenant administration, plans, and platform health."
    >
      <AuthForm action={platformLoginAction} fields={fields} submitLabel="Sign in" next={next} />
    </AuthCard>
  );
}
