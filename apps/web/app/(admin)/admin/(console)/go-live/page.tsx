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
        title={welcome ? "Welcome to alarent" : "Go live"}
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
          Share <span className="font-mono text-signal">{checklist.storefrontUrl}</span> and start selling.
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
          className="mb-5 h-1.5 w-full border border-line-soft bg-ink-hover"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-signal transition-[width] duration-surface ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <ul className="divide-y divide-line-soft">
          {checklist.items.map((item) => (
            <li key={item.key} className="flex items-start gap-3 py-3">
              <span
                aria-hidden="true"
                className={
                  item.done
                    ? "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-signal text-signal-ink"
                    : "mt-0.5 h-5 w-5 shrink-0 border border-line-strong"
                }
              >
                {item.done ? <Check size={12} strokeWidth={3} /> : null}
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2.5 text-[13.5px] text-paper">
                  {item.label}
                  {!item.required ? (
                    <Badge tone="neutral" className="font-normal">
                      Optional
                    </Badge>
                  ) : null}
                </p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-paper-faint">
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
        <p className="border border-line-soft bg-ink-sunk px-3 py-2.5 font-mono text-[13px] text-signal">
          {checklist.storefrontUrl}
        </p>
        <p className="mt-3 text-[12.5px] leading-relaxed text-paper-faint">
          Want your own domain instead?{" "}
          <Link href="/admin/settings" className="text-signal hover:underline">
            Connect one in settings
          </Link>
          .
        </p>
      </Card>
    </Page>
  );
}
