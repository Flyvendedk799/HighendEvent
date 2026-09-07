import Link from "next/link";
import { Badge, Banner, Button, Card, CardHeader, Page, PageHeader } from "@rentora/ui";
import { Check } from "lucide-react";
import { getGoLiveChecklist } from "@/lib/actions/store";

export const metadata = { title: "Go live" };
export const dynamic = "force-dynamic";

export default async function GoLivePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const checklist = await getGoLiveChecklist();
  const percent = Math.round((checklist.completed / checklist.total) * 100);

  return (
    <Page className="max-w-3xl">
      <PageHeader
        title={welcome ? "Welcome to Rentora" : "Go live"}
        description={
          welcome
            ? "Your store exists. Here is what is left before you can take a booking."
            : "Every item here is checked against your real data, not ticked off by hand."
        }
      />

      {checklist.readyToLaunch ? (
        <Banner
          tone="success"
          title="You are ready to take bookings"
          className="mb-6"
          action={
            <Button size="sm" variant="secondary" asChild>
              <a href={`https://${checklist.storefrontUrl}`} target="_blank" rel="noreferrer">
                Open storefront
              </a>
            </Button>
          }
        >
          Share <strong>{checklist.storefrontUrl}</strong> and start selling.
        </Banner>
      ) : (
        <Banner tone="warning" title="Not quite ready" className="mb-6">
          Finish the required steps below before you share your storefront.
        </Banner>
      )}

      <Card>
        <CardHeader
          title="Setup"
          description={`${checklist.completed} of ${checklist.total} complete`}
          action={<Badge tone={percent === 100 ? "success" : "neutral"}>{percent}%</Badge>}
        />

        <div
          className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-muted)]"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>

        <ul className="divide-y divide-[var(--color-border)]">
          {checklist.items.map((item) => (
            <li key={item.key} className="flex items-start gap-3 py-3">
              <span
                aria-hidden="true"
                className={
                  item.done
                    ? "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white"
                    : "mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-[var(--color-border)]"
                }
              >
                {item.done ? <Check size={12} strokeWidth={3} /> : null}
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {item.label}
                  {!item.required ? (
                    <Badge tone="neutral" className="font-normal">
                      Optional
                    </Badge>
                  ) : null}
                </p>
                <p className="mt-0.5 truncate text-xs text-[var(--color-muted-foreground)]">
                  {item.detail}
                </p>
              </div>

              {!item.done ? (
                <Button size="sm" variant="secondary" asChild>
                  <Link href={item.href}>Fix</Link>
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Your storefront address"
          description="This is where your customers go."
        />
        <p className="font-mono text-sm">{checklist.storefrontUrl}</p>
        <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
          Want your own domain instead?{" "}
          <Link href="/admin/settings" className="text-[var(--color-primary)] hover:underline">
            Connect one in settings
          </Link>
          .
        </p>
      </Card>
    </Page>
  );
}
