"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Banner, Button, Input } from "@rentora/ui";
import type { AuthFormState } from "@/lib/auth-actions";

export type AuthField = {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  hint?: string;
  defaultValue?: string;
  half?: boolean;
};

export function AuthForm({
  action,
  fields,
  submitLabel,
  next,
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  fields: AuthField[];
  submitLabel: string;
  next?: string;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.error ? (
        <Banner tone="danger">
          {state.error}
        </Banner>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.name} className={field.half ? undefined : "sm:col-span-2"}>
            <Input
              name={field.name}
              type={field.type ?? "text"}
              label={field.label}
              placeholder={field.placeholder}
              required={field.required}
              autoComplete={field.autoComplete}
              hint={field.hint}
              defaultValue={field.defaultValue}
              className="h-10"
            />
          </div>
        ))}
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" loading={pending} className="w-full">
      {label}
    </Button>
  );
}
