import { PlatformNav } from "@/components/platform-nav";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-mesh-light">
      <PlatformNav />
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
