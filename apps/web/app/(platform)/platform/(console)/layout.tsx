import { PlatformShell } from "@/components/platform-shell";
import { logoutAction } from "@/lib/auth-actions";
import { requirePlatform } from "@/lib/session";

export default async function PlatformConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePlatform();

  async function logout() {
    "use server";
    await logoutAction();
  }

  return (
    <PlatformShell userEmail={session.email} logout={logout}>
      {children}
    </PlatformShell>
  );
}
