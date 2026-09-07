"use client";

import { useState, useTransition } from "react";
import {
  Badge,
  Banner,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  Input,
  useToast,
} from "@rentora/ui";
import {
  addDomainAction,
  removeDomainAction,
  verifyDomainAction,
  type CustomDomain,
} from "@/lib/actions/domains";

export function DomainsCard({
  domains,
  fallbackHost,
  allowed,
}: {
  domains: CustomDomain[];
  fallbackHost: string;
  allowed: boolean;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [hostname, setHostname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  function add() {
    setError(null);
    startTransition(async () => {
      const result = await addDomainAction(hostname);
      if (result.error) {
        setError(result.error);
        return;
      }
      setHostname("");
      toast({ title: "Domain added", description: "Now add the DNS records below." });
    });
  }

  function verify(domain: CustomDomain) {
    startTransition(async () => {
      const result = await verifyDomainAction(domain.id);
      if (result.error) {
        toast({ title: "Verification failed", description: result.error, tone: "error" });
        return;
      }
      setMessages((current) => ({ ...current, [domain.id]: result.message ?? "" }));
      toast(
        result.verified
          ? { title: `${domain.hostname} verified` }
          : { title: "Not verified yet", description: result.message, tone: "error" },
      );
    });
  }

  return (
    <Card>
      <CardHeader
        title="Your own domain"
        description={`Without one, your storefront lives at ${fallbackHost}.`}
      />

      {!allowed ? (
        <Banner tone="info" title="Custom domains are on Growth and Scale">
          Upgrade your plan to serve your storefront from your own domain.
        </Banner>
      ) : (
        <>
          {error ? (
            <Banner tone="danger" className="mb-4">
              {error}
            </Banner>
          ) : null}

          <div className="flex items-end gap-2">
            <Input
              label="Add a domain"
              placeholder="shop.example.com"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              className="h-9"
            />
            <Button variant="secondary" disabled={pending || !hostname.trim()} onClick={add}>
              Add
            </Button>
          </div>

          {domains.length > 0 ? (
            <ul className="mt-5 space-y-4">
              {domains.map((domain) => (
                <li
                  key={domain.id}
                  className="border border-line p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{domain.hostname}</p>
                      <p className="font-mono text-[11px] text-paper-faint">
                        SSL: {domain.sslStatus}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={domain.verified ? "success" : "warning"}>
                        {domain.verified ? "Verified" : "Awaiting DNS"}
                      </Badge>
                      {!domain.verified ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={pending}
                          onClick={() => verify(domain)}
                        >
                          Check DNS
                        </Button>
                      ) : null}
                      <RemoveDomain domain={domain} />
                    </div>
                  </div>

                  {messages[domain.id] ? (
                    <Banner tone={domain.verified ? "success" : "warning"} className="mt-3">
                      {messages[domain.id]}
                    </Banner>
                  ) : null}

                  {!domain.verified ? (
                    <div className="mt-3 space-y-2">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper-mute">
                        Add these records at your DNS provider:
                      </p>
                      <DnsRecord record={domain.instructions.verification} />
                      <DnsRecord record={domain.instructions.routing} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[13.5px] text-paper-mute">
              No custom domain yet.
            </p>
          )}
        </>
      )}
    </Card>
  );
}

function DnsRecord({
  record,
}: {
  record: { type: string; name: string; value: string; note?: string | null };
}) {
  return (
    <div className="bg-ink-hover p-2.5 font-mono text-[11px]">
      <div className="grid gap-1 sm:grid-cols-[70px_1fr]">
        <span className="text-paper-mute">Type</span>
        <span>{record.type}</span>
        <span className="text-paper-mute">Name</span>
        <span className="break-all">{record.name}</span>
        <span className="text-paper-mute">Value</span>
        <span className="break-all">{record.value}</span>
      </div>
      {record.note ? (
        <p className="mt-1.5 font-sans text-[11px] text-paper-mute">
          {record.note}
        </p>
      ) : null}
    </div>
  );
}

function RemoveDomain({ domain }: { domain: CustomDomain }) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="ghost" className="text-danger">
          Remove
        </Button>
      }
      title={`Remove ${domain.hostname}?`}
      description="Traffic to this domain will stop reaching your storefront immediately."
      confirmLabel="Remove domain"
      destructive
      onConfirm={() =>
        startTransition(async () => {
          const result = await removeDomainAction(domain.id);
          toast(
            result.error
              ? { title: "Could not remove", description: result.error, tone: "error" }
              : { title: "Domain removed" },
          );
        })
      }
    />
  );
}
