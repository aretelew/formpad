'use client';

import HistoryRow from './HistoryRow';
import type { HistoryEntry } from './Calculator';

interface HistoryAreaProps {
  history: HistoryEntry[];
  onExplain: (entry: HistoryEntry) => void;
  onReload: (latex: string) => void;
}

export default function HistoryArea({ history, onExplain, onReload }: HistoryAreaProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-0.5">
      {history.length === 0 && (
        <p className="text-[#999999] text-sm text-center pt-8">
          Enter an expression and press Enter
        </p>
      )}
      {history.map((entry) => (
        <HistoryRow
          key={entry.id}
          entry={entry}
          onExplain={onExplain}
          onReload={onReload}
        />
      ))}
    </div>
  );
}
