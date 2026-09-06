import { Suspense } from "react";
import SettingsClient from "./settings-client";

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<main className="p-6 text-sm text-muted-foreground">Loading settings…</main>}>
      <SettingsClient />
    </Suspense>
  );
}
