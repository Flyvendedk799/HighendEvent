import Link from "next/link";
import { LiveDot } from "@rentora/ui";

const links = [
  { href: "#surfaces", label: "Surfaces" },
  { href: "#flow", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
];

export function MarketingHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-ink/70 backdrop-blur-md">
      <div className="flex items-center justify-between gap-5 px-gutter py-3.5 font-mono text-[11px] uppercase tracking-[0.12em] text-paper-mute">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 text-paper">
          <LiveDot />
          <span className="font-semibold tracking-[0.22em]">alarent</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors duration-instant hover:text-signal"
            >
              {link.label}
            </a>
          ))}
          <Link href="/platform" className="transition-colors duration-instant hover:text-signal">
            Platform
          </Link>
        </nav>

        <Link
          href="/signup"
          className="bg-signal px-4 py-2.5 font-semibold tracking-[0.12em] text-signal-ink transition-colors duration-instant hover:bg-signal-press"
        >
          Start free
        </Link>
      </div>
    </header>
  );
}
