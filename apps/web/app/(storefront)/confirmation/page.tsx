import { Suspense } from "react";
import { ConfirmationClient } from "./confirmation-client";

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-xl py-10 text-center text-muted-foreground">
          Confirming booking…
        </main>
      }
    >
      <ConfirmationClient />
    </Suspense>
  );
}
