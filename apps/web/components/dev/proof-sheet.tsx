"use client";

import { useState } from "react";
import {
  Badge,
  Banner,
  Button,
  Calendar,
  EmptyState,
  Input,
  LiveDot,
  Meter,
  Money,
  OccupancyBoard,
  Panel,
  QuantityStepper,
  ScopeSwitch,
  Select,
  StatCard,
  StatStrip,
  StatusBadge,
  StatusText,
  Switch,
  Table,
  TableContainer,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  type BoardRow,
  type DateRangeValue,
  type DayState,
} from "@rentora/ui";

const DAYS = ["Mon 9", "Tue 10", "Wed 11", "Thu 12", "Fri 13", "Sat 14", "Sun 15"];

const ROWS: BoardRow[] = [
  {
    id: "a",
    code: "×4",
    name: "Stretch tent 6×12",
    bars: [
      { id: "a1", label: "Holm wedding", start: 0, span: 3 },
      { id: "a2", label: "Nordic Party", start: 4, span: 3 },
    ],
  },
  {
    id: "b",
    code: "×2",
    name: "Dancefloor 36m²",
    bars: [
      { id: "b1", label: "prep + clean", start: 1, span: 2, tone: "quiet" },
      { id: "b2", label: "Lumen AV", start: 3, span: 4, tone: "warn" },
    ],
  },
  {
    id: "c",
    code: "×1",
    name: "Festoon 50m",
    bars: [{ id: "c1", label: "Overdue · Lumen AV", start: 0, span: 5, tone: "danger" }],
  },
];

function calendarDays(): Record<string, DayState> {
  const out: Record<string, DayState> = {};
  const base = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(base.getTime() + i * 86_400_000);
    const iso = d.toISOString().slice(0, 10);
    const mod = i % 9;
    out[iso] =
      mod === 3 || mod === 4
        ? { availableQuantity: 0, isAvailable: false, isBlackedOut: true }
        : mod === 5
          ? { availableQuantity: 0, isAvailable: false, isBlackedOut: false, isBuffer: true }
          : mod === 6
            ? { availableQuantity: 1, isAvailable: true, isBlackedOut: false }
            : { availableQuantity: 4, isAvailable: true, isBlackedOut: false };
  }
  return out;
}

export function ProofSheet() {
  const [range, setRange] = useState<DateRangeValue>({ start: null, end: null });
  const [qty, setQty] = useState(2);
  const [scope, setScope] = useState<"day" | "week" | "month">("week");

  return (
    <main className="alarent-console mx-auto max-w-[1400px] space-y-6 p-6">
      <header className="border-b border-line pb-5">
        <p className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
          <LiveDot />
          alarent — design system proof
        </p>
        <h1 className="mt-4 text-[38px] font-semibold tracking-[-0.04em]">Dispatch</h1>
      </header>

      <StatStrip>
        <StatCard density="console" label="Out today" value="4" hint="vans loaded by 07:30" />
        <StatCard
          density="console"
          label="Due back"
          value="3"
          tone="danger"
          hint="1 overdue since Thursday"
        />
        <StatCard
          density="console"
          label="Unpaid"
          value="2"
          tone="warn"
          hint={<Money amountMinor={431000} currency="DKK" locale="da" />}
        />
        <StatCard density="console" label="Utilisation" value="84.2%" tone="signal" hint="+6.1 wk" />
        <StatCard
          density="console"
          label="Booked"
          value={<Money amountMinor={6840000} currency="DKK" locale="da" />}
          hint="week 24, incl. moms"
        />
      </StatStrip>

      <Panel
        title={
          <span className="flex items-center gap-2.5">
            <LiveDot />
            Occupancy — week 24
          </span>
        }
        action={
          <ScopeSwitch
            value={scope}
            onChange={setScope}
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
        }
        footer="Computed from confirmed bookings against stock, buffers included."
      >
        <OccupancyBoard
          columns={DAYS}
          rows={ROWS}
          nowFraction={0.5}
          density="console"
          className="border-0"
        />
      </Panel>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(330px,1fr))]">
        <Panel title="Buttons">
          <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="lg">Primary lg</Button>
              <Button>md</Button>
              <Button size="sm">sm</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button disabled>Disabled</Button>
              <Button loading>Loading</Button>
            </div>
            <div>
              <Button variant="link">A link button</Button>
            </div>
          </div>
        </Panel>

        <Panel title="Status chips">
          <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge statusKey="fully_paid" />
              <StatusBadge statusKey="pending" />
              <StatusBadge statusKey="out_for_delivery" />
              <StatusBadge statusKey="returned_damaged" />
              <StatusBadge statusKey="cancelled" />
              <Badge tone="quiet">Buffer</Badge>
            </div>
            <div className="flex flex-wrap gap-4">
              <StatusText statusKey="fully_paid" />
              <StatusText statusKey="pending" />
              <StatusText statusKey="returned_damaged" />
            </div>
          </div>
        </Panel>

        <Panel title="Fields">
          <div className="flex flex-col gap-4 p-4">
            <Input label="Collection date" defaultValue="2024-06-14" />
            <Input label="Quantity" defaultValue="12" error="Only 8 free on those dates." />
            <Select
              label="Fulfilment"
              options={[
                { value: "p", label: "Collect from us" },
                { value: "d", label: "Delivery" },
              ]}
            />
            <QuantityStepper value={qty} onChange={setQty} max={4} />
            <Switch label="Take deposits" description="Charge part now, the balance before the dates." />
          </div>
        </Panel>

        <Panel title="Feedback">
          <div className="flex flex-col gap-4 p-4">
            <Banner tone="warning" title="Not quite ready">
              Finish the required steps before you share your storefront.
            </Banner>
            <Banner tone="danger" title="Overdue">
              Festoon run 50 m was due back on Thursday.
            </Banner>
            <Meter label="Tents" value={96} />
            <Meter label="Sound" value={74} />
            <Meter label="Heat" value={22} />
          </div>
        </Panel>
      </div>

      <Panel title="Table — 42px rows, hairline">
        <TableContainer className="border-0">
          <Table>
            <THead>
              <Tr>
                <Th>Booking</Th>
                <Th>Customer</Th>
                <Th>Status</Th>
                <Th align="right">Total</Th>
              </Tr>
            </THead>
            <TBody>
              {[
                { ref: "#AL-2418", who: "Holm wedding · Frederiksberg", s: "fully_paid", t: 1240000 },
                { ref: "#AL-2419", who: "Lumen AV Hire", s: "pending", t: 389000 },
                { ref: "#AL-2420", who: "Vega launch party", s: "out_for_delivery", t: 715000 },
              ].map((row) => (
                <Tr key={row.ref} interactive>
                  <Td>
                    <span className="font-mono text-[12.5px]">{row.ref}</span>
                  </Td>
                  <Td>{row.who}</Td>
                  <Td>
                    <StatusBadge statusKey={row.s} />
                  </Td>
                  <Td numeric>
                    <Money amountMinor={row.t} currency="DKK" locale="da" />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </TableContainer>
      </Panel>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(330px,1fr))]">
        <div>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-paper-mute">
            Availability calendar
          </p>
          <Calendar days={calendarDays()} value={range} onChange={setRange} months={1} />
        </div>
        <Panel title="Empty state">
          <div className="p-6">
            <EmptyState
              title="No bookings yet"
              description="Add your first item and it appears on the board."
              action={<Button>Add item</Button>}
            />
          </div>
        </Panel>
      </div>
    </main>
  );
}
