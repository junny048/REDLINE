import { ReactNode } from "react";

type LockedResultsProps<T> = {
  items: T[];
  locked: boolean;
  renderItem: (item: T, index: number) => ReactNode;
  emptyMessage: string;
  lockedMessage?: string;
};

export function LockedResults<T>({ items, locked, renderItem, emptyMessage, lockedMessage }: LockedResultsProps<T>) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  if (!locked) {
    return <div className="space-y-2">{items.map((item, idx) => <div key={idx}>{renderItem(item, idx)}</div>)}</div>;
  }

  const visible = items.slice(0, 1);
  const hidden = items.slice(1);

  return (
    <div className="space-y-2">
      {visible.map((item, idx) => (
        <div key={`visible-${idx}`}>{renderItem(item, idx)}</div>
      ))}
      {hidden.length > 0 && (
        <div className="space-y-2 rounded-lg border border-dashed border-slate-300 p-2">
          {hidden.map((item, idx) => (
            <div key={`hidden-${idx}`} className="pointer-events-none blur-[3px] opacity-80">
              {renderItem(item, idx + 1)}
            </div>
          ))}
          <p className="text-xs font-semibold text-slate-500">{lockedMessage ?? "Locked results. Unlock to view all."}</p>
        </div>
      )}
    </div>
  );
}
