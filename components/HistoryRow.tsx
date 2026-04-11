'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';
import type { HistoryEntry } from './Calculator';

interface HistoryRowProps {
  entry: HistoryEntry;
  onExplain: (entry: HistoryEntry) => void;
  onReload: (latex: string) => void;
}

export default function HistoryRow({ entry, onExplain, onReload }: HistoryRowProps) {
  const exprRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!exprRef.current) return;
    try {
      katex.render(entry.latex, exprRef.current, {
        throwOnError: false,
        displayMode: false,
        output: 'html',
      });
    } catch {
      exprRef.current.textContent = entry.latex;
    }
  }, [entry.latex]);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-[#252525]"
      onClick={() => onReload(entry.latex)}
    >
      <span ref={exprRef} className="flex-1 text-lg text-[#eeeeee] min-w-0 overflow-hidden" />
      <span className="text-sm text-[#999999] whitespace-nowrap tabular-nums">
        {entry.source === 'wolfram' && (
          <span className="inline-block text-[9px] font-bold bg-[#7c3aed] text-white px-1 py-px rounded mr-1 align-middle">
            W
          </span>
        )}
        {'= '}
        {entry.result}
      </span>
      <button
        className="shrink-0 text-sm text-[#999999] px-1.5 py-1 rounded transition-colors hover:text-[#2b7fff] hover:bg-[#252525]"
        title="Explain"
        onClick={(e) => {
          e.stopPropagation();
          onExplain(entry);
        }}
      >
        ✦
      </button>
    </div>
  );
}
