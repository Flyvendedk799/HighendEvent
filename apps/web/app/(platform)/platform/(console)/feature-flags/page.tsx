"use client";

import { useState } from "react";
import { Badge, Card } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";

const initialFlags = [
  {
    key: "storefront.v2_checkout",
    description: "New multi-step checkout on tenant shops",
    enabled: true,
  },
  {
    key: "admin.manual_pricing",
    description: "Allow managers to override line totals",
    enabled: true,
  },
  {
    key: "platform.usage_metering",
    description: "Collect usage events for metered billing",
    enabled: false,
  },
  {
    key: "delivery.mapbox_eta",
    description: "Show Mapbox ETA on delivery quotes",
    enabled: false,
  },
];

export default function PlatformFeatureFlagsPage() {
  const [flags, setFlags] = useState(initialFlags);

  return (
    <main>
      <PageHeader
        title="Feature flags"
        description="Stub toggles for gradual rollouts across tenants."
      />
      <div className="space-y-3">
        {flags.map((flag) => (
          <Card key={flag.key} className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-sm font-medium">{flag.key}</p>
              <p className="mt-1 text-sm text-muted-foreground">{flag.description}</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setFlags((prev) =>
                  prev.map((f) => (f.key === flag.key ? { ...f, enabled: !f.enabled } : f)),
                )
              }
              className="flex items-center gap-3"
            >
              <Badge tone={flag.enabled ? "success" : "neutral"}>
                {flag.enabled ? "On" : "Off"}
              </Badge>
              <span
                className={`relative h-6 w-11 rounded-full transition ${
                  flag.enabled ? "bg-teal-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                    flag.enabled ? "left-5" : "left-0.5"
                  }`}
                />
              </span>
            </button>
          </Card>
        ))}
      </div>
    </main>
  );
}
