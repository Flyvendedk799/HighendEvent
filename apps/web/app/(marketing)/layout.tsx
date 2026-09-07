import { MarketingHeader } from "@/components/marketing-header";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
     * `clip`, not `hidden`. The hero's grid layer is inset -25% and must not widen the page, but
     * `overflow-x: hidden` computes `overflow-y` to `auto` and turns this div into a scroll
     * container — which silently breaks the sticky stage the whole hero is built on.
     */
    <div className="alarent-marketing min-h-screen [overflow-x:clip]">
      <MarketingHeader />
      {children}
    </div>
  );
}
