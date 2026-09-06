import Link from "next/link";
import { Button, Card, Badge } from "@rentora/ui";
import { getDictionary } from "@/lib/i18n";

export default function ConfirmationPage() {
  const t = getDictionary("en");

  return (
    <main className="mx-auto max-w-xl py-10 text-center">
      <Badge tone="success">Confirmed</Badge>
      <h1 className="mt-4 font-display text-4xl font-semibold">{t.confirmation.title}</h1>
      <p className="mt-3 text-muted-foreground">{t.confirmation.subtitle}</p>
      <Card className="mt-8 space-y-3 text-left text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Booking</span>
          <span className="font-medium">BK-1049</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Dates</span>
          <span className="font-medium">20–21 Sep 2026</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total</span>
          <span className="font-medium">3.540 DKK</span>
        </div>
      </Card>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/account/bookings">
          <Button>View bookings</Button>
        </Link>
        <Link href="/catalog">
          <Button variant="secondary">Continue browsing</Button>
        </Link>
      </div>
    </main>
  );
}
