'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { Entry } from './Calculator';
import type { FieldHandle } from '@/types/mathfield';

// Skip SSR — react-mathquill touches document at import time
const HistoryRow = dynamic(() => import('./HistoryRow'), { ssr: false });

interface Props {
  entries: Entry[];
  onCommit: (id: number, latex: string) => void;
  onLiveChange: (id: number, latex: string) => void;
  onDelete: (id: number) => void;
  onFocus: (id: number) => void;
  onNavigate: (id: number, direction: 'up' | 'down') => void;
  registerField: (id: number, handle: FieldHandle | null) => void;
}

export default function HistoryArea({ entries, onCommit, onLiveChange, onDelete, onFocus, onNavigate, registerField }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Inject MathQuill stylesheet once on the client
  useEffect(() => {
    import('react-mathquill').then(({ addStyles }) => addStyles());
  }, []);

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
