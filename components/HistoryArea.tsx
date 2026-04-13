'use client';

import { useEffect, useRef } from 'react';
import HistoryRow from './HistoryRow';
import type { Entry } from './Calculator';

interface Props {
  entries: Entry[];
  onCommit: (id: number, latex: string) => void;
  onLiveChange: (id: number, latex: string) => void;
  onDelete: (id: number) => void;
  onFocus: (id: number) => void;
  onNavigate: (id: number, direction: 'up' | 'down') => void;
  registerField: (id: number, el: any) => void;
}

export default function HistoryArea({ entries, onCommit, onLiveChange, onDelete, onFocus, onNavigate, registerField }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const scrollToBottom = () => {
      const el = containerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    };
    const observer = new ResizeObserver(scrollToBottom);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto flex flex-col gap-0 min-h-0">
      <div className="flex-1" />
      <div ref={contentRef} className="flex flex-col">
        {entries.map((entry) => (
          <HistoryRow
            key={entry.id}
            entry={entry}
            deletable={entries.length > 1}
            onCommit={onCommit}
            onLiveChange={onLiveChange}
            onDelete={onDelete}
            onFocus={onFocus}
            onNavigate={onNavigate}
            registerField={registerField}
          />
        ))}
      </div>
    </div>
  );
}
