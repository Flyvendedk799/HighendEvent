import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { AuthForm, type AuthField } from "@/components/auth-form";
import { customerRegisterAction } from "@/lib/auth-actions";
import { getSession } from "@/lib/session";
import { getBootstrap } from "@/lib/tenant";

export const metadata = { title: "Create an account" };

const fields: AuthField[] = [
  { name: "firstName", label: "First name", required: true, autoComplete: "given-name", half: true },
  { name: "lastName", label: "Last name", required: true, autoComplete: "family-name", half: true },
  {
    name: "email",
    label: "Email",
    type: "email",
    required: true,
    autoComplete: "email",
    placeholder: "you@example.com",
  },
  { name: "phone", label: "Phone", type: "tel", autoComplete: "tel", hint: "So the crew can reach you on delivery day." },
  {
    name: "password",
    label: "Password",
    type: "password",
    required: true,
    autoComplete: "new-password",
    hint: "At least 8 characters.",
  },
];

export default async function CustomerRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  if ((await getSession())?.role === "customer") {
    redirect("/account/dashboard");
  }

  const bootstrap = await getBootstrap();

  return (
    <AuthCard
      eyebrow={bootstrap?.store.name}
      title="Create an account"
      description="Track your bookings and check out faster next time."
      footer={
        <span>
          Already have an account?{" "}
          <Link
            href="/account/login"
            className="font-medium text-signal hover:underline"
          >
            Log in
          </Link>
        </span>
      }
    >
      <AuthForm
        action={customerRegisterAction}
        fields={fields}
        submitLabel="Create account"
        next={next}
      />
    </AuthCard>
  );
}
