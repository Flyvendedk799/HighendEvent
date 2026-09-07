"use client";

import { useTransition } from "react";
import { Button } from "@rentora/ui";
import { logoutAction } from "@/lib/auth-actions";

export function LogoutButton({ label = "Log out" }: { label?: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      loading={pending}
      onClick={() => startTransition(async () => void (await logoutAction()))}
    >
      {label}
    </Button>
  );
}
