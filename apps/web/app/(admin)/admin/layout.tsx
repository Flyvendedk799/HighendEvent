import type { Metadata } from "next";
import { ToastProvider } from "@rentora/ui";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s · Rentora Admin",
  },
  robots: { index: false, follow: false },
};

/**
 * The `rentora-admin` class swaps in the neutral operations palette. Everything below this
 * point — console and login alike — is data UI, not marketing.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rentora-admin min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}
