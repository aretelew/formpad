'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import HistoryArea from './HistoryArea';
import Keypad from './Keypad';
import { tryComputeEngine } from '@/lib/computeEngine';
import { isKnownHard } from '@/lib/hardPatterns';
import type { FieldHandle } from '@/types/mathfield';

export type Entry = {
  id: number;
  latex: string;
  result: string;
  source: 'ce' | 'wolfram' | 'error' | 'undefined' | '';
  steps?: string | null;
};

// Keep old alias so any future code referencing HistoryEntry still compiles
export type HistoryEntry = Entry;

type RedoOp =
  | { type: 'char'; id: number; latex: string }    // field had this latex before deleteBackward
  | { type: 'row';  entry: Entry; position: number }; // empty row was deleted, restore here

function makeEntry(): Entry {
  return { id: Date.now() + Math.floor(Math.random() * 1e6), latex: '', result: '', source: '' };
}

export default function Calculator() {
  const [entries, setEntries] = useState<Entry[]>(() => [makeEntry()]);
  const [angleMode, setAngleMode] = useState<'RAD' | 'DEG'>('DEG');
  // The FieldHandle for the currently-focused row — Keypad always writes here
  const activeMfRef = useRef<FieldHandle | null>(null);
  // Bound commit thunk for the currently-focused row — called by Keypad's ↵ button
  const activeCommitRef = useRef<(() => void) | null>(null);

  // Snapshot undo/redo — only used for "clear all" restore
  const undoStackRef = useRef<Entry[][]>([]);
  const redoStackRef = useRef<Entry[][]>([]);
  const [globalCanUndo, setGlobalCanUndo] = useState(false);
  // Per-operation redo stack for character / row-level operations
  const charRedoRef = useRef<RedoOp[]>([]);
  const [canRedo, setCanRedo] = useState(false);
  // Each undo/redo op fires exactly one edit event that should NOT clear the
  // redo stack.  Increment before the op; handleLiveChange decrements instead of clearing.
  const skipClearRedoRef = useRef(0);
  // Track whether the active field has typed content (enables in-field undo via button)
  const [activeFieldHasContent, setActiveFieldHasContent] = useState(false);
  // After undo/redo, sync MathQuill field values to entry.latex
  const pendingSyncRef = useRef<Entry[] | null>(null);

  // Map from entry id → FieldHandle
  const fieldRefs = useRef<Map<number, FieldHandle>>(new Map());

  // After a state update that adds a new entry, focus it
  const pendingFocusId = useRef<number | null>(null);

  // Keep angleMode accessible inside the stable handleCommit callback
  const angleModeRef = useRef(angleMode);
  useEffect(() => { angleModeRef.current = angleMode; }, [angleMode]);

  // Re-evaluate all entries when angle mode changes
  useEffect(() => {
    setEntries(prev => {
      const next = [...prev];
      for (let idx = 0; idx < next.length; idx++) {
        const e = next[idx];
        // entry.latex is only populated after commit; for live (uncommitted) entries
        // fall back to reading the current value directly from the field handle.
        const latex = e.latex.trim() || fieldRefs.current.get(e.id)?.getLatex()?.trim() || '';
        if (!latex) continue;

        const ans = next.slice(0, idx)
          .reverse()
          .find(x => x.result && x.source !== 'error' && x.source !== 'undefined')?.result ?? '0';

        const processed = latex.replace(/\\text\{ans\}/g, `(${ans})`);

        let result = 'error';
        let source: Entry['source'] = 'error';

        if (!isKnownHard(processed)) {
          const ceResult = tryComputeEngine(processed, angleMode);
          if (ceResult === 'Undefined') {
            result = 'undefined';
            source = 'undefined';
          } else if (ceResult !== null) {
            result = ceResult;
            source = 'ce';
          }
        }

        next[idx] = { ...e, result, source };
      }
      return next;
    });
  }, [angleMode]);

  useEffect(() => {
    if (pendingFocusId.current === null) return;
    const id = pendingFocusId.current;
    pendingFocusId.current = null;
    // rAF ensures MathQuill has finished any internal reinit after the render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fieldRefs.current.get(id)?.focus();
      });
    });
  }, [entries]);

  const handleLiveChange = useCallback((id: number, latex: string) => {
    // If this input event was caused by undo/redo, skip clearing; otherwise invalidate redo
    if (skipClearRedoRef.current > 0) {
      skipClearRedoRef.current--;
    } else if (charRedoRef.current.length > 0) {
      charRedoRef.current = [];
      setCanRedo(false);
    }
    // Keep active-field content tracking in sync
    if (fieldRefs.current.get(id) === activeMfRef.current) {
      setActiveFieldHasContent(!!latex.trim());
    }
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === id);
      if (idx === -1) return prev;

      if (!latex.trim()) {
        return prev.map(e => e.id === id ? { ...e, result: '', source: '' } : e);
      }

      const ans = [...prev.slice(0, idx)]
        .reverse()
        .find(e => e.result && e.source !== 'error' && e.source !== 'undefined')?.result ?? '0';

      const processed = latex.replace(/\\text\{ans\}/g, `(${ans})`);

      let result = '';
      let source: Entry['source'] = '';

      if (!isKnownHard(processed)) {
        const ceResult = tryComputeEngine(processed, angleModeRef.current);
        if (ceResult === 'Undefined') {
          result = 'undefined';
          source = 'undefined';
        } else if (ceResult !== null) {
          result = ceResult;
          source = 'ce';
        }
      }

      // During live typing: only show result when CE can evaluate; suppress error for incomplete expressions
      return prev.map(e => e.id === id ? { ...e, result, source } : e);
    });
  }, []);

  const handleCommit = useCallback((id: number, latex: string) => {
    if (!latex.trim()) return;

    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === id);
      if (idx === -1) return prev;

      // ans = result of the most recent successfully evaluated entry before this one
      const ans = [...prev.slice(0, idx)]
        .reverse()
        .find(e => e.result && e.source !== 'error' && e.source !== 'undefined')?.result ?? '0';

      const processed = latex.replace(/\\text\{ans\}/g, `(${ans})`);

      let result = 'error';
      let source: Entry['source'] = 'error';

      if (!isKnownHard(processed)) {
        const ceResult = tryComputeEngine(processed, angleModeRef.current);
        if (ceResult === 'Undefined') {
          result = 'undefined';
          source = 'undefined';
        } else if (ceResult !== null) {
          result = ceResult;
          source = 'ce';
        }
      }

      const updated = prev.map(e =>
        e.id === id ? { ...e, latex, result, source } : e
      );

      // Committed the last row → append a new blank entry and focus it
      if (idx === updated.length - 1) {
        const newEntry = makeEntry();
        pendingFocusId.current = newEntry.id;
        return [...updated, newEntry];
      }

      // Committed a middle row → just focus the next row
      pendingFocusId.current = updated[idx + 1].id;
      return updated;
    });

  }, []);

  const handleDelete = useCallback((id: number) => {
    setEntries(prev => {
      if (prev.length <= 1) return prev; // always keep at least one row
      const idx = prev.findIndex(e => e.id === id);
      if (idx === -1) return prev;
      const next = prev.filter(e => e.id !== id);
      const focusIdx = Math.max(0, idx - 1);
      pendingFocusId.current = next[focusIdx].id;
      return next;
    });
  }, []);

  const registerField = useCallback((id: number, handle: FieldHandle | null) => {
    if (handle) fieldRefs.current.set(id, handle);
    else fieldRefs.current.delete(id);
  }, []);

  const handleFocus = useCallback((id: number) => {
    const field = fieldRefs.current.get(id) ?? null;
    activeMfRef.current = field;
    setActiveFieldHasContent(!!(field?.getLatex()?.trim()));
    // Bind a commit thunk for this row so Keypad's ↵ button can trigger it
    activeCommitRef.current = () => {
      const latex = fieldRefs.current.get(id)?.getLatex() ?? '';
      handleCommit(id, latex);
    };
  }, [handleCommit]);

  // Read entries without subscribing — used by handleNavigate to avoid stale closures
  const entriesRef = useRef(entries);
  useEffect(() => { entriesRef.current = entries; }, [entries]);

  // After undo/redo: sync MathQuill field values to entry.latex
  useEffect(() => {
    if (!pendingSyncRef.current) return;
    const toSync = pendingSyncRef.current;
    pendingSyncRef.current = null;
    requestAnimationFrame(() => {
      for (const entry of toSync) {
        const field = fieldRefs.current.get(entry.id);
        if (field) field.setLatex(entry.latex || '');
      }
    });
  }, [entries]);

  const handleClearHistory = useCallback(() => {
    undoStackRef.current = [...undoStackRef.current.slice(-49), entriesRef.current];
    redoStackRef.current = [];
    charRedoRef.current = [];
    setGlobalCanUndo(true);
    setCanRedo(false);
    setEntries([makeEntry()]);
  }, []);

  const handleUndo = useCallback(() => {
    const field = activeMfRef.current;

    // Find active row index (needed for both branches)
    const cur = entriesRef.current;
    let activeIdx = -1;
    let activeId: number | undefined;
    for (const [id, f] of fieldRefs.current.entries()) {
      if (f === field) { activeId = id; activeIdx = cur.findIndex(e => e.id === id); break; }
    }

    // Active field has content → delete one character, save latex for redo
    if (field && field.getLatex().trim()) {
      const before = field.getLatex();
      if (activeId !== undefined) {
        charRedoRef.current = [...charRedoRef.current, { type: 'char', id: activeId, latex: before }];
        setCanRedo(true);
      }
      skipClearRedoRef.current++;
      field.keystroke('Backspace');
      field.focus();
      return;
    }

    // Active field is empty and not the first row → delete this row (reverse of Enter),
    // save it for redo
    if (activeIdx > 0) {
      const deletedEntry = cur[activeIdx];
      charRedoRef.current = [...charRedoRef.current, { type: 'row', entry: deletedEntry, position: activeIdx }];
      setCanRedo(true);
      setEntries(prev => {
        const idx = prev.findIndex(e => e.id === deletedEntry.id);
        if (idx <= 0) return prev;
        const next = prev.filter(e => e.id !== deletedEntry.id);
        pendingFocusId.current = next[idx - 1].id;
        return next;
      });
      return;
    }

    // First/only row is empty → snapshot restore (only reachable after "clear all")
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    redoStackRef.current = [...redoStackRef.current, entriesRef.current];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    setGlobalCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
    pendingSyncRef.current = prev;
    pendingFocusId.current = prev[prev.length - 1].id;
    setEntries(prev);
  }, []);

  const handleRedo = useCallback(() => {
    // Per-operation redo (char or row)
    if (charRedoRef.current.length > 0) {
      const op = charRedoRef.current[charRedoRef.current.length - 1];
      charRedoRef.current = charRedoRef.current.slice(0, -1);
      setCanRedo(charRedoRef.current.length > 0 || redoStackRef.current.length > 0);

      if (op.type === 'char') {
        const f = fieldRefs.current.get(op.id);
        if (f) {
          // setLatex guards against firing edit; call handleLiveChange manually to recompute result
          skipClearRedoRef.current++;
          f.setLatex(op.latex);
          f.focus();
          setActiveFieldHasContent(!!op.latex.trim());
          handleLiveChange(op.id, op.latex);
        }
      } else {
        // Re-insert the deleted row at its original position, then focus it
        setEntries(prev => {
          const next = [...prev];
          next.splice(op.position, 0, op.entry);
          pendingFocusId.current = op.entry.id;
          return next;
        });
      }
      return;
    }

    // Snapshot redo (for clear all)
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current[redoStackRef.current.length - 1];
    undoStackRef.current = [...undoStackRef.current, entriesRef.current];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    setGlobalCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    pendingSyncRef.current = next;
    pendingFocusId.current = next[next.length - 1].id;
    setEntries(next);
  }, [handleLiveChange]);

  const handleNavigate = useCallback((id: number, direction: 'up' | 'down') => {
    const cur = entriesRef.current;
    const idx = cur.findIndex(e => e.id === id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= cur.length) return;
    const target = fieldRefs.current.get(cur[targetIdx].id);
    if (target) target.focus();
  }, []);

  return (
    <div className="w-full max-w-[780px] h-[min(calc(100vh-2rem),860px)] flex flex-col bg-background rounded overflow-hidden shadow-2xl border border-border">
      <HistoryArea
        entries={entries}
        onCommit={handleCommit}
        onLiveChange={handleLiveChange}
        onDelete={handleDelete}
        onFocus={handleFocus}
        onNavigate={handleNavigate}
        registerField={registerField}
      />
      <Keypad
        mathfieldRef={activeMfRef}
        commitRef={activeCommitRef}
        angleMode={angleMode}
        onAngleModeChange={setAngleMode}
        onClearHistory={handleClearHistory}
        canUndo={globalCanUndo || activeFieldHasContent || entries.some(e => !!e.latex.trim()) || entries.length > 1}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />
    </div>
  );
}
