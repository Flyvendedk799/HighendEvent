import { AdminSidebar } from "@/components/admin-sidebar";
import { headers } from "next/headers";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  // Best-effort active path from referer/middleware is unavailable; pages highlight via CSS alone.
  void h;
  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar />
      <div className="flex-1 overflow-x-hidden">
        <div className="border-b border-border bg-surface px-6 py-3 text-sm text-muted-foreground md:hidden">
          Tenant admin
        </div>
        <div className="p-6 md:p-8">{children}</div>
      </div>
    </div>
  );
}
