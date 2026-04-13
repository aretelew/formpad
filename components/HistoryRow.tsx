'use client';

import { useEffect, useRef } from 'react';
import 'mathlive';
import katex from 'katex';
import { Badge } from '@/components/ui/badge';
import type { Entry } from './Calculator';

interface Props {
  entry: Entry;
  deletable: boolean;
  onCommit: (id: number, latex: string) => void;
  onLiveChange: (id: number, latex: string) => void;
  onDelete: (id: number) => void;
  onFocus: (id: number) => void;
  onNavigate: (id: number, direction: 'up' | 'down') => void;
  registerField: (id: number, el: any) => void;
}

export default function HistoryRow({ entry, deletable, onCommit, onLiveChange, onDelete, onFocus, onNavigate, registerField }: Props) {
  const mfRef = useRef<any>(null);
  const resultRef = useRef<HTMLSpanElement>(null);

  // Stable refs so the one-time setup effect never needs to re-run when
  // callbacks are recreated by the parent
  const onCommitRef = useRef(onCommit);
  const onLiveChangeRef = useRef(onLiveChange);
  const onDeleteRef = useRef(onDelete);
  const onFocusRef = useRef(onFocus);
  const onNavigateRef = useRef(onNavigate);
  const deletableRef = useRef(deletable);
  useEffect(() => { onCommitRef.current = onCommit; });
  useEffect(() => { onLiveChangeRef.current = onLiveChange; });
  useEffect(() => { onDeleteRef.current = onDelete; });
  useEffect(() => { onFocusRef.current = onFocus; });
  useEffect(() => { onNavigateRef.current = onNavigate; });
  useEffect(() => { deletableRef.current = deletable; });

  // One-time mount: configure math-field and attach event listeners
  useEffect(() => {
    const mf = mfRef.current;
    if (!mf) return;

    mf.mathVirtualKeyboardPolicy = 'manual';
    mf.menuItems = [];

    const handleCommit = () => {
      // MathLive fires 'change' on both Enter AND blur. Only commit on Enter
      // (field still focused) or when triggered programmatically (keypad).
      // Skip if the field lost focus — that means the user just clicked elsewhere.
      if (!mf.hasFocus()) return;
      onCommitRef.current(entry.id, mf.getValue('latex'));
    };
    const handleInput = () => {
      onLiveChangeRef.current(entry.id, mf.getValue('latex'));
    };
    // Track whether the field was empty *before* MathLive processes the
    // keystroke.  MathLive handles Backspace during the capture/target phase,
    // so by the time a bubbling-phase keydown listener runs the character is
    // already gone and getValue() returns ''.  We snapshot the "was-empty"
    // state in capture phase and consume it in the bubbling handler.
    let wasEmptyBeforeKey = false;
    const captureKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        wasEmptyBeforeKey = !mf.getValue('latex').trim();
      }
    };
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' && wasEmptyBeforeKey && deletableRef.current) {
        e.preventDefault();
        mf.blur();
        onDeleteRef.current(entry.id);
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        onNavigateRef.current(entry.id, e.key === 'ArrowUp' ? 'up' : 'down');
      }
    };
    const handleFocus = () => {
      onFocusRef.current(entry.id);
    };

    mf.addEventListener('change', handleCommit);
    mf.addEventListener('input', handleInput);
    mf.addEventListener('keydown', captureKeydown, true);   // capture phase
    mf.addEventListener('keydown', handleKeydown);           // bubble phase
    mf.addEventListener('focus', handleFocus);

    // Fresh entry (no result yet) → auto-focus after MathLive initialises.
    // MathLive defers internal setup after connectedCallback, so retry until ready.
    let cancelled = false;
    if (!entry.result) {
      let attempts = 0;
      const tryFocus = () => {
        if (cancelled) return;
        try {
          mf.focus();
        } catch {
          if (++attempts < 15) setTimeout(tryFocus, 20);
        }
      };
      setTimeout(tryFocus, 0);
    }

    return () => {
      cancelled = true;
      mf.removeEventListener('change', handleCommit);
      mf.removeEventListener('input', handleInput);
      mf.removeEventListener('keydown', captureKeydown, true);
      mf.removeEventListener('keydown', handleKeydown);
      mf.removeEventListener('focus', handleFocus);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Register / deregister this field in the parent's ref map
  useEffect(() => {
    const mf = mfRef.current;
    registerField(entry.id, mf);
    return () => registerField(entry.id, null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render result via KaTeX whenever it changes
  useEffect(() => {
    if (!resultRef.current) return;
    if (!entry.result) {
      resultRef.current.textContent = '';
      return;
    }
    if (entry.source === 'error' || entry.source === 'undefined') {
      resultRef.current.textContent = '= ' + entry.result;
      return;
    }
    try {
      katex.render('= ' + entry.result, resultRef.current, {
        throwOnError: false,
        displayMode: false,
        output: 'html',
      });
    } catch {
      resultRef.current.textContent = '= ' + entry.result;
    }
  }, [entry.result, entry.source]);

  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 border-t border-border min-h-[60px] bg-background"
      onClick={() => mfRef.current?.focus()}
    >
      <math-field
        ref={mfRef}
        suppressHydrationWarning
        style={{ flex: 1, fontSize: '20px', minHeight: '1.5em', '--ML__fieldbackground-color': 'transparent' } as React.CSSProperties}
      />
      {entry.result && (
        <span className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
          {entry.source === 'wolfram' && (
            <Badge
              variant="secondary"
              className="text-[9px] px-1 py-0 h-4 bg-violet-600 text-white hover:bg-violet-600"
            >
              W
            </Badge>
          )}
          <span
            ref={resultRef}
            className={`text-lg tabular-nums ${
              entry.source === 'error' ? 'text-destructive' : 'text-foreground'
            }`}
          />
        </span>
      )}
    </div>
  );
}
