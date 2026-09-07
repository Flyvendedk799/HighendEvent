import { Page, PageHeader } from "@rentora/ui";
import { LocationsManager } from "@/components/admin/locations-manager";
import { getLocations } from "@/lib/actions/operations";

export const metadata = { title: "Locations" };
export const dynamic = "force-dynamic";

export default async function AdminLocationsPage() {
  const locations = await getLocations();

  return (
    <Page className="max-w-4xl">
      <PageHeader
        title="Locations"
        description="Where customers collect from, and the point delivery distances are measured from."
      />
      <LocationsManager locations={locations} />
    </Page>
  );
}
