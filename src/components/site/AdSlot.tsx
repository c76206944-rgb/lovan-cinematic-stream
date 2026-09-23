/** Reserved space for an advert. Filled once an ad partner is connected; shows a quiet label until then. */
export function AdSlot({ placement }: { placement: "banner" | "sponsored_card" }) {
  return (
    <aside
      aria-label="Advertisement"
      data-ad-placement={placement}
      className={`mx-4 my-8 flex items-center justify-center rounded-md border border-dashed border-border text-[11px] uppercase tracking-[0.25em] text-muted-foreground sm:mx-6 ${placement === "banner" ? "h-24" : "h-40"}`}
    >
      Advertisement
    </aside>
  );
}
