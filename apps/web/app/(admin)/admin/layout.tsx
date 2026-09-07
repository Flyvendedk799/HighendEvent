import type { Metadata } from "next";
import { ToastProvider } from "@rentora/ui";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s · alarent console",
  },
  robots: { index: false, follow: false },
};

/**
 * The `alarent-console` class runs the same tokens at the console's tighter density. Everything
 * below this point — console and login alike — is data UI, not marketing.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="alarent-console min-h-screen bg-ink-sunk text-paper">
      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}
