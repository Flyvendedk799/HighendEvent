import { notFound } from "next/navigation";
import { ProofSheet } from "@/components/dev/proof-sheet";

/**
 * The living reference for Dispatch: metrics, the occupancy board, buttons, chips, fields,
 * feedback, tables and the availability calendar, rendered by the real components rather than a
 * screenshot of them. It exists so a change to a primitive can be seen against every other one
 * before it ships.
 *
 * Development only — the guard is here, on the server, rather than inside the client component,
 * so the sheet never reaches a browser in production and the hook order stays unconditional.
 */
export const metadata = { title: "Design system", robots: { index: false, follow: false } };

export default function ProofSheetPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ProofSheet />;
}
