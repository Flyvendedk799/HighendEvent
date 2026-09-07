import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

/*
 * Two faces, one family. Plex Sans carries anything a human wrote; Plex Mono carries anything
 * a machine produced — SKUs, money, dates, counts, status. There is no display serif.
 */
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "alarent",
    template: "%s · alarent",
  },
  description:
    "The rental operating system. Stock, buffers, delivery and money on one board — and the board is never wrong.",
};

export const viewport = {
  themeColor: "#0C0D0F",
  colorScheme: "dark" as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
