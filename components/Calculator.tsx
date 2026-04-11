'use client';

import { useState, useRef } from 'react';
import MathInput from './MathInput';
import HistoryArea from './HistoryArea';
import Keypad from './Keypad';
import RadDegToggle from './RadDegToggle';
import { tryComputeEngine } from '@/lib/computeEngine';
import { isKnownHard } from '@/lib/hardPatterns';

export type HistoryEntry = {
  id: number;
  latex: string;
  result: string;
  source: 'ce' | 'wolfram' | 'error';
  steps?: string | null;
};

export default function Calculator() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [angleMode, setAngleMode] = useState<'RAD' | 'DEG'>('DEG');
  const [loading, setLoading] = useState(false);
  const mathfieldRef = useRef<any>(null);

  const ans = history[0]?.result ?? '0';

  function addToHistory(
    latex: string,
    result: string,
    source: HistoryEntry['source'],
    steps?: string | null
  ) {
    setHistory((prev) => [{ id: Date.now(), latex, result, source, steps }, ...prev]);
  }

  async function handleCommit(latex: string) {
    if (!latex.trim()) return;
    setLoading(true);

    // Substitute \text{ans} with the last result
    const processed = latex.replace(/\\text\{ans\}/g, `(${ans})`);

    if (!isKnownHard(processed)) {
      const ceResult = tryComputeEngine(processed, angleMode);
      if (ceResult !== null) {
        addToHistory(latex, ceResult, 'ce');
        setLoading(false);
        return;
      }
    }

    // Phase 2+ will add Wolfram fallback here
    addToHistory(latex, 'Could not evaluate', 'error');
    setLoading(false);
  }

  function handleReload(latex: string) {
    if (mathfieldRef.current) {
      mathfieldRef.current.setValue(latex);
      mathfieldRef.current.focus();
    }
  }

  function handleExplain(_entry: HistoryEntry) {
    // Phase 3: AI explanation panel
  }

  return (
    <div className="w-full max-w-[480px] h-[min(100vh,760px)] flex flex-col bg-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl">
      <HistoryArea history={history} onExplain={handleExplain} onReload={handleReload} />
      <MathInput ref={mathfieldRef} onCommit={handleCommit} loading={loading} />
      <div className="flex items-center justify-end px-4 py-1.5 bg-[#252525] border-b border-[#333333]">
        <RadDegToggle value={angleMode} onChange={setAngleMode} />
      </div>
      <Keypad mathfieldRef={mathfieldRef} />
    </div>
  );
}
