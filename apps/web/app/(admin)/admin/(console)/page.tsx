import Link from "next/link";
import {
  Banner,
  Button,
  EmptyState,
  LiveDot,
  Meter,
  Money,
  OccupancyBoard,
  Page,
  PageHeader,
  Panel,
  StatCard,
  StatStrip,
  StatusText,
  cx,
} from "@rentora/ui";
import { serverGet } from "@/lib/server-api";
import { isApiError } from "@/lib/api";
import { overviewToBoard, utilisationOf, weekWindow } from "@/lib/board";
import type {
  AnalyticsKpis,
  AvailabilityOverview,
  Booking,
  StorefrontBootstrap,
} from "@/lib/types";

export const metadata = { title: "Today" };
export const dynamic = "force-dynamic";

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayOf(value: string): string {
  return value.slice(0, 10);
}

/** Anything that would cost the tenant money or goodwill if it were missed today. */
type Attention = {
  booking: Booking;
  tag: string;
  tone: "warn" | "danger";
  reason: string;
  action: string;
};

function needsAttention(bookings: Booking[]): Attention[] {
  const today = isoToday();
  const out: Attention[] = [];

  for (const booking of bookings) {
    if (booking.statusKey === "out_for_delivery" && dayOf(booking.endDate) < today) {
      out.push({
        booking,
        tag: "Overdue",
        tone: "danger",
        reason: `Due back ${dayOf(booking.endDate)} and still out`,
        action: "Chase",
      });
      continue;
    }
    if (booking.remainingMinor > 0 && dayOf(booking.startDate) <= today) {
      out.push({
        booking,
        tag: "Unpaid",
        tone: "warn",
        reason: `Starts ${dayOf(booking.startDate)} with a balance outstanding`,
        action: "Send link",
      });
      continue;
    }
    if (booking.statusKey === "pending" && dayOf(booking.startDate) <= today) {
      out.push({
        booking,
        tag: "Unconfirmed",
        tone: "warn",
        reason: `Starts ${dayOf(booking.startDate)} and has never been paid`,
        action: "Open",
      });
    }
  }

  return out;
}

export default async function AdminOverviewPage() {
  const [kpis, bookings, bootstrap] = await Promise.all([
    serverGet<AnalyticsKpis>("/analytics/kpis", { cache: "no-store" }).catch(() => null),
    serverGet<Booking[]>("/bookings", { cache: "no-store" }).catch(() => [] as Booking[]),
    serverGet<StorefrontBootstrap>("/storefront/bootstrap").catch((err) => {
      if (isApiError(err)) return null;
      throw err;
    }),
  ]);

  const locale = bootstrap?.store.localeDefault ?? "en";
  const week = weekWindow(new Date(), locale);

  const overview = await serverGet<AvailabilityOverview>(
    `/availability/overview?startDate=${week.startDate}&endDate=${week.endDate}`,
    { cache: "no-store" },
  ).catch(() => null);

  const currency = bootstrap?.store.currency ?? "USD";
  const today = isoToday();
  const live = bookings.filter((b) => !b.isDeleted && b.statusKey !== "cancelled");

  const goingOut = live.filter((b) => dayOf(b.startDate) === today);
  const dueBack = live.filter((b) => dayOf(b.endDate) === today);
  const overdue = live.filter(
    (b) => b.statusKey === "out_for_delivery" && dayOf(b.endDate) < today,
  );
  const unpaid = live.filter((b) => b.remainingMinor > 0 && dayOf(b.startDate) <= today);
  const unpaidMinor = unpaid.reduce((sum, b) => sum + b.remainingMinor, 0);

  const thisWeek = live.filter(
    (b) => dayOf(b.startDate) <= week.endDate && dayOf(b.endDate) >= week.startDate,
  );
  const bookedMinor = thisWeek.reduce((sum, b) => sum + b.totalMinor, 0);

  const attention = needsAttention(live);
  const agenda = [...goingOut, ...dueBack.filter((b) => !goingOut.includes(b))].slice(0, 8);

  const rows = overview ? overviewToBoard(overview, week, { limit: 10, onlyBusy: true }) : [];
  const utilisation = overview ? utilisationOf(overview, week).slice(0, 6) : [];

  const setupIncomplete =
    bootstrap && (!bootstrap.features.hasProducts || !bootstrap.tenant.connectOnboarded);

  const heading = new Intl.DateTimeFormat(locale === "da" ? "da-DK" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${today}T00:00:00Z`));

  return (
    <Page>
      <PageHeader
        title={heading}
        eyebrow={`${bootstrap?.store.name ?? "Your store"} · week of ${week.label}`}
        secondaryAction={
          <Button variant="secondary" asChild>
            <a href="/api/bookings.ics">Day sheet (ICS)</a>
          </Button>
        }
        action={
          <Button asChild>
            <Link href="/admin/bookings/new">New booking</Link>
          </Button>
        }
      />

      {setupIncomplete ? (
        <Banner
          tone="warning"
          title="Not ready to take bookings"
          className="mb-5"
          action={
            <Button size="sm" variant="secondary" asChild>
              <Link href="/admin/go-live">Open checklist</Link>
            </Button>
          }
        >
          {!bootstrap.features.hasProducts
            ? "Add at least one product"
            : "Finish Stripe payouts onboarding"}{" "}
          before you share your storefront.
        </Banner>
      ) : null}

      <StatStrip className="mb-5">
        <StatCard
          density="console"
          label="Out today"
          value={goingOut.length}
          hint={goingOut.length === 0 ? "Nothing leaves the warehouse" : "Loads leaving today"}
        />
        <StatCard
          density="console"
          label="Due back"
          value={dueBack.length}
          tone={overdue.length > 0 ? "danger" : "default"}
          hint={
            overdue.length > 0
              ? `${overdue.length} already overdue`
              : dueBack.length === 0
                ? "Nothing returning"
                : "Returning today"
          }
        />
        <StatCard
          density="console"
          label="Unpaid"
          value={unpaid.length}
          tone={unpaid.length > 0 ? "warn" : "default"}
          hint={
            unpaid.length > 0 ? (
              <>
                <Money amountMinor={unpaidMinor} currency={currency} locale={locale} /> outstanding
              </>
            ) : (
              "Every started booking is paid"
            )
          }
        />
        <StatCard
          density="console"
          label="Booked this week"
          value={<Money amountMinor={bookedMinor} currency={currency} locale={locale} />}
          hint={`${thisWeek.length} booking${thisWeek.length === 1 ? "" : "s"} touching this week`}
        />
        <StatCard
          density="console"
          label="Revenue"
          value={<Money amountMinor={kpis?.revenueMinor ?? 0} currency={currency} locale={locale} />}
          hint={`${kpis?.bookingsLast30Days ?? 0} bookings in the last 30 days`}
        />
      </StatStrip>

      <div className="grid gap-4">
        {/* Needs attention */}
        <Panel
          title={
            attention.length > 0 ? `Needs attention — ${attention.length}` : "Needs attention"
          }
          tone={attention.some((a) => a.tone === "danger") ? "danger" : "warn"}
          action={
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper-faint">
              Clears itself when resolved
            </span>
          }
        >
          {attention.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Nothing to chase"
                description="Overdue returns, unpaid balances and unconfirmed holds appear here on the day they matter."
              />
            </div>
          ) : (
            <ul>
              {attention.slice(0, 6).map((item) => (
                <li key={item.booking.id}>
                  <Link
                    href={`/admin/bookings/${item.booking.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-line-soft px-4 py-3 transition-colors duration-instant last:border-b-0 hover:bg-ink-hover"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2.5 text-[13.5px]">
                        <span
                          className={cx(
                            "font-mono text-[10px] uppercase tracking-[0.14em]",
                            item.tone === "danger" ? "text-danger" : "text-warn",
                          )}
                        >
                          {item.tag}
                        </span>
                        <span className="truncate text-paper">{item.booking.customerName}</span>
                      </p>
                      <p className="mt-1 truncate font-mono text-[11px] text-paper-faint">
                        {item.booking.bookingNo} · {item.reason}
                        {item.booking.remainingMinor > 0 ? (
                          <>
                            {" · "}
                            <Money
                              amountMinor={item.booking.remainingMinor}
                              currency={item.booking.currency}
                              locale={locale}
                            />{" "}
                            due
                          </>
                        ) : null}
                      </p>
                    </div>
                    <span className="shrink-0 border border-line-strong px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-paper-dim">
                      {item.action}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* The board */}
        <Panel
          title={
            <span className="flex items-center gap-2.5">
              <LiveDot />
              Occupancy — {week.label}
            </span>
          }
          action={
            <Link
              href="/admin/calendar"
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-signal transition-colors duration-instant hover:text-paper"
            >
              Whole month →
            </Link>
          }
          footer="Computed from confirmed bookings against stock, buffers included. Items with nothing on them this week are hidden."
        >
          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Nothing booked this week"
                description="Bookings appear on the board the moment they are paid — the same board your customers price their dates against."
                action={
                  <Button asChild>
                    <Link href="/admin/bookings/new">Create a booking</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <OccupancyBoard
              columns={week.labels}
              rows={rows}
              nowFraction={week.nowFraction ?? undefined}
              density="console"
              className="border-0"
              renderLink={({ href, className, children }) => (
                <Link href={href} className={className}>
                  {children}
                </Link>
              )}
            />
          )}
        </Panel>

        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
          {/* Today's movements */}
          <Panel
            title={`Moving today — ${agenda.length}`}
            action={
              <Link
                href="/admin/bookings"
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-signal transition-colors duration-instant hover:text-paper"
              >
                All bookings →
              </Link>
            }
          >
            <div className="grid grid-cols-[78px_minmax(0,1fr)_74px_80px] gap-3 border-b border-line px-4 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-paper-ghost">
              <span>Ref</span>
              <span>Customer</span>
              <span>Status</span>
              <span className="text-right">Total</span>
            </div>
            {agenda.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="Nothing moves today"
                  description="Departures and returns land here on the day they happen."
                />
              </div>
            ) : (
              <ul>
                {agenda.map((booking) => (
                  <li key={booking.id}>
                    <Link
                      href={`/admin/bookings/${booking.id}`}
                      className="grid h-9 grid-cols-[78px_minmax(0,1fr)_74px_80px] items-center gap-3 border-b border-line-soft px-4 text-[12.5px] transition-colors duration-instant last:border-b-0 hover:bg-ink-hover"
                    >
                      <span className="truncate font-mono text-[10.5px] text-paper-mute">
                        {booking.bookingNo}
                      </span>
                      <span className="truncate">{booking.customerName}</span>
                      <StatusText statusKey={booking.statusKey} />
                      <span className="text-right font-mono text-[11.5px] tabular-nums">
                        <Money
                          amountMinor={booking.totalMinor}
                          currency={booking.currency}
                          locale={locale}
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Utilisation */}
          <Panel
            title={`Utilisation — ${week.label}`}
            footer="Committed day-capacity against stock, buffers included. Anything under 40% is stock that is not earning."
          >
            {utilisation.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No stock to measure"
                  description="Add products with a stock count and their utilisation appears here."
                  action={
                    <Button asChild>
                      <Link href="/admin/products/new">Add a product</Link>
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 p-4">
                {utilisation.map((item) => (
                  <Meter
                    key={item.id}
                    label={item.name}
                    value={item.pct}
                    caption={`${Math.round(item.pct)}% · ×${item.stock}`}
                  />
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </Page>
  );
}
