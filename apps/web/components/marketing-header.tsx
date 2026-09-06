import Link from "next/link";
import { Button } from "@rentora/ui";

const links = [
  { href: "#product", label: "Product" },
  { href: "#pricing", label: "Pricing" },
  { href: "#customers", label: "Customers" },
];

export function MarketingHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-display text-2xl font-semibold tracking-tight text-white">
          Rentora
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-white/80 md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/platform"
            className="hidden text-sm text-white/80 transition hover:text-white sm:inline"
          >
            Platform
          </Link>
          <Link href="#pricing">
            <Button size="sm" className="bg-amber-400 text-slate-950 hover:bg-amber-300">
              Start free
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
