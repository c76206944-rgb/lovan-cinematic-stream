import { useState } from "react";
import {
  FIELD_LABELS,
  changedKeys,
  clearHistory,
  describeTime,
  listHistory,
  type HistoryEntry,
  type HistoryFields,
} from "@/lib/ai-history";

type Props = {
  titleId: string;
  refreshKey: number;
  onApply: (fields: HistoryFields) => void;
};

export function MetadataHistory({ titleId, refreshKey, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(0);
  const entries = open ? listHistory(titleId) : [];
  void refreshKey;
  void bump;

  return (
    <div className="mt-5 rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm text-foreground"
      >
        <span>Change history</span>
        <span className="text-xs text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>

      {open ? (
        <div className="border-t border-border px-4 py-3">
          {entries.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No changes recorded yet for this title. Filling details with AI or saving is recorded here.
            </p>
          ) : (
            <>
              <ul className="space-y-3">
                {entries.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} onApply={onApply} />
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  clearHistory(titleId);
                  setBump((v) => v + 1);
                }}
                className="mt-3 text-xs text-muted-foreground underline"
              >
                Clear history for this title
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function EntryRow({ entry, onApply }: { entry: HistoryEntry; onApply: (fields: HistoryFields) => void }) {
  const keys = changedKeys(entry.before, entry.after);
  return (
    <li className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-foreground">{entry.label}</span>
        <span className="text-xs text-muted-foreground">{describeTime(entry.at)}</span>
      </div>
      <dl className="mt-2 space-y-2">
        {keys.map((key) => (
          <div key={key}>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{FIELD_LABELS[key] ?? key}</dt>
            <dd className="text-xs text-muted-foreground">
              <span className="line-through">{entry.before[key] || "empty"}</span>
              <span className="mx-2 text-muted-foreground">to</span>
              <span className="text-foreground">{entry.after[key] || "empty"}</span>
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onApply(entry.before)}
          className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={() => onApply(entry.after)}
          className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Restore
        </button>
      </div>
    </li>
  );
}
