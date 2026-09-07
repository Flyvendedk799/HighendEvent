import type { Metadata } from "next";
import { ToastProvider } from "@rentora/ui";

export const metadata: Metadata = {
  title: {
    default: "Platform",
    template: "%s · Rentora Platform",
  },
  robots: { index: false, follow: false },
};

export default function PlatformRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rentora-admin min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}
