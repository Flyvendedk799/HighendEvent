import { AdminShell } from "@/components/admin-shell";
import { logoutAction } from "@/lib/auth-actions";
import { requireStaff } from "@/lib/session";
import { serverGet } from "@/lib/server-api";
import { isApiError } from "@/lib/api";
import type { Booking, StorefrontBootstrap } from "@/lib/types";

/** Bookings starting or ending today are what staff need to see the moment they log in. */
async function attentionCount(): Promise<number> {
  try {
    const bookings = await serverGet<Booking[]>("/bookings", { cache: "no-store" });
    const today = new Date().toISOString().slice(0, 10);
    return bookings.filter(
      (b) =>
        !b.isDeleted &&
        (b.startDate.slice(0, 10) === today || b.endDate.slice(0, 10) === today),
    ).length;
  } catch {
    return 0;
  }
}

async function loadBootstrap(): Promise<StorefrontBootstrap | null> {
  try {
    return await serverGet<StorefrontBootstrap>("/storefront/bootstrap");
  } catch (err) {
    // A brand-new tenant has no store row yet; the console still has to render.
    if (isApiError(err)) return null;
    throw err;
  }
}

export default async function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStaff();
  const [bootstrap, attention] = await Promise.all([loadBootstrap(), attentionCount()]);

  async function logout() {
    "use server";
    await logoutAction();
  }

  return (
    <AdminShell
      storeName={bootstrap?.store.name ?? "Your store"}
      userName={session.name ?? session.email}
      userEmail={session.email}
      staffRole={session.staffRole ?? "STAFF"}
      attentionCount={attention}
      payoutsReady={bootstrap?.tenant.connectOnboarded ?? false}
      primaryDomain={bootstrap?.tenant.primaryDomain ?? null}
      logout={logout}
    >
      {children}
    </AdminShell>
  );
}
