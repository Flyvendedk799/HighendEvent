import { Page, PageHeader } from "@rentora/ui";
import { StaffManager } from "@/components/admin/staff-manager";
import { getStaff } from "@/lib/actions/staff";
import { requireStaff } from "@/lib/session";
import { serverGet } from "@/lib/server-api";

export const metadata = { title: "Staff" };
export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const session = await requireStaff();

  const [staff, limits] = await Promise.all([
    getStaff(),
    serverGet<{ atStaffLimit: boolean }>("/billing/limits", { cache: "no-store" }).catch(
      () => null,
    ),
  ]);

  return (
    <Page className="max-w-4xl">
      <PageHeader
        title="Staff"
        description="Who can get into your console, and what each of them may change."
      />
      <StaffManager
        staff={staff}
        currentUserId={session.sub}
        canManage={session.staffRole === "OWNER" || session.staffRole === "MANAGER"}
        atSeatLimit={limits?.atStaffLimit ?? false}
      />
    </Page>
  );
}
