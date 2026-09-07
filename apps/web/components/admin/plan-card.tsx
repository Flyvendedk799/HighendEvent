import { Badge, Banner, Card, CardHeader, DataList } from "@rentora/ui";

type PlanUsage = {
  plan: "STARTER" | "GROWTH" | "SCALE";
  limits: {
    name: string;
    maxProducts: number | null;
    maxStaff: number | null;
    customDomains: boolean;
    apiAccess: boolean;
    applicationFeeBps: number;
  };
  usage: { products: number; staff: number; domains: number };
  atProductLimit: boolean;
  atStaffLimit: boolean;
};

function limitLabel(used: number, max: number | null): string {
  return max === null ? `${used} (unlimited)` : `${used} of ${max}`;
}

export function PlanCard({ usage }: { usage: PlanUsage | null }) {
  if (!usage) {
    return (
      <Card>
        <CardHeader title="Plan" />
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Plan details could not be loaded.
        </p>
      </Card>
    );
  }

  const { limits, usage: used } = usage;

  return (
    <Card>
      <CardHeader
        title="Your plan"
        description="Limits are enforced when you create the thing, not just here."
        action={<Badge tone="info">{limits.name}</Badge>}
      />

      {usage.atProductLimit || usage.atStaffLimit ? (
        <Banner tone="warning" className="mb-4">
          {usage.atProductLimit
            ? "You have used every published product slot on this plan."
            : "You have used every staff seat on this plan."}{" "}
          Contact us to move up a plan.
        </Banner>
      ) : null}

      <DataList
        items={[
          { label: "Published products", value: limitLabel(used.products, limits.maxProducts) },
          { label: "Staff seats", value: limitLabel(used.staff, limits.maxStaff) },
          {
            label: "Custom domains",
            value: limits.customDomains ? `${used.domains} connected` : "Not on this plan",
          },
          { label: "API access", value: limits.apiAccess ? "Included" : "Not on this plan" },
          {
            label: "Platform fee",
            value: `${(limits.applicationFeeBps / 100).toFixed(2)}% per booking`,
          },
        ]}
      />
    </Card>
  );
}
