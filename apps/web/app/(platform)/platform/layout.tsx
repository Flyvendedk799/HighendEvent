import type { Metadata } from "next";
import { ToastProvider } from "@rentora/ui";

export const metadata: Metadata = {
  title: {
    default: "Platform",
    template: "%s · alarent platform",
  },
  robots: { index: false, follow: false },
};

export default function PlatformRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="alarent-console min-h-screen bg-ink-sunk text-paper">
      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}
