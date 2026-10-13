import { useState } from "react";
import { clearAdsForKids } from "@/lib/ads";
import { enterKidsMode, exitKidsMode, useKidsMode } from "@/lib/kids-mode";

/** Header switch for Kids Mode. Leaving it needs the parent PIN. */
export function KidsModeButton() {
  const kids = useKidsMode();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => { setOpen(false); setPin(""); setError(null); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) return setError("Enter 4 digits.");
    if (kids) {
      if (!exitKidsMode(pin)) return setError("Wrong PIN.");
    } else {
      enterKidsMode(pin);
      clearAdsForKids();
    }
    close();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-md border px-3 py-2 text-sm transition-colors ${kids ? "border-primary text-primary" : "border-border text-foreground hover:border-primary"}`}
      >
        {kids ? "Kids on" : "Kids"}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4" onClick={close}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-lg border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-foreground">{kids ? "Leave Kids Mode" : "Turn on Kids Mode"}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {kids
                ? "Enter the parent PIN to show everything again."
                : "Only animation and family titles will show, with no adverts. Choose a 4 digit parent PIN to lock it."}
            </p>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              type="password"
              autoFocus
              aria-label="Parent PIN"
              className="mt-4 w-full rounded-md border border-border bg-background px-3 py-2 text-center text-lg tracking-[0.5em] text-foreground outline-none focus:border-primary"
            />
            {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
            <div className="mt-5 flex gap-3">
              <button type="submit" className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                {kids ? "Unlock" : "Lock Kids Mode"}
              </button>
              <button type="button" onClick={close} className="rounded-md border border-border px-4 py-2 text-sm text-foreground">
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
