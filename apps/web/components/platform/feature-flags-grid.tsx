"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  EmptyState,
  Switch,
  Table,
  TableContainer,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  useToast,
} from "@rentora/ui";
import { setTenantFlagsAction, type PlatformTenant } from "@/lib/actions/platform";

export type FlagDefinition = { key: string; label: string; description: string };

/**
 * The flags Rentora actually reads. Anything not listed here would be a flag that changes
 * nothing, which is worse than no flag at all.
 */
export const FLAGS: FlagDefinition[] = [
  {
    key: "upsells",
    label: "Add-ons",
    description: "Lets the tenant attach paid extras to products.",
  },
  {
    key: "deliveryZones",
    label: "Delivery zones",
    description: "Zone-based delivery pricing alongside distance pricing.",
  },
  {
    key: "customDomains",
    label: "Custom domains",
    description: "Overrides the plan restriction on connecting an own domain.",
  },
  {
    key: "apiKeys",
    label: "API access",
    description: "Programmatic access and outbound webhooks.",
  },
];

export function FeatureFlagsGrid({
  tenants,
  flags,
}: {
  tenants: PlatformTenant[];
  flags: FlagDefinition[];
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function toggle(tenant: PlatformTenant, key: string, enabled: boolean) {
    startTransition(async () => {
      const result = await setTenantFlagsAction(tenant.id, { [key]: enabled });
      toast(
        result.error
          ? { title: "Could not save", description: result.error, tone: "error" }
          : {
              title: `${key} ${enabled ? "enabled" : "disabled"} for ${tenant.slug}`,
            },
      );
    });
  }

  if (tenants.length === 0) {
    return (
      <EmptyState
        title="No tenants yet"
        description="Flags apply per tenant, so there is nothing to toggle."
      />
    );
  }

  return (
    <>
      <dl className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {flags.map((flag) => (
          <div
            key={flag.key}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
          >
            <dt className="text-sm font-medium">{flag.label}</dt>
            <dd className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
              {flag.description}
            </dd>
          </div>
        ))}
      </dl>

      <TableContainer>
        <Table>
          <THead>
            <Tr>
              <Th>Tenant</Th>
              {flags.map((flag) => (
                <Th key={flag.key} align="center">
                  {flag.label}
                </Th>
              ))}
            </Tr>
          </THead>
          <TBody>
            {tenants.map((tenant) => (
              <Tr key={tenant.id}>
                <Td>
                  <Link
                    href={`/platform/tenants/${tenant.slug}`}
                    className="font-medium hover:underline"
                  >
                    {tenant.name}
                  </Link>
                  <span className="block text-xs text-[var(--color-muted-foreground)]">
                    {tenant.plan}
                  </span>
                </Td>
                {flags.map((flag) => (
                  <Td key={flag.key} align="center">
                    <div className="flex justify-center">
                      <Switch
                        checked={Boolean(tenant.featureFlags?.[flag.key])}
                        disabled={pending}
                        onCheckedChange={(checked) => toggle(tenant, flag.key, checked)}
                      />
                    </div>
                  </Td>
                ))}
              </Tr>
            ))}
          </TBody>
        </Table>
      </TableContainer>
    </>
  );
}
