'use client';

import { useEffect, forwardRef } from 'react';
import 'mathlive';

interface MathInputProps {
  onCommit: (latex: string) => void;
  loading: boolean;
}

const MathInput = forwardRef<any, MathInputProps>(function MathInput(
  { onCommit, loading },
  ref
) {
  useEffect(() => {
    const mf = (ref as React.RefObject<any>)?.current;
    if (!mf) return;

    mf.mathVirtualKeyboardPolicy = 'manual';
    mf.menuItems = []; // disable built-in hamburger/context menu

    const handleChange = () => {
      const latex: string = mf.getValue('latex');
      if (latex.trim()) {
        onCommit(latex);
        mf.setValue('');
        mf.focus();
      }
    };

    mf.addEventListener('change', handleChange);

    // Pin the minimum height to the true single-line rendered height so that
    // the empty cursor (shorter than actual character metrics) never jumps
    // when a digit is typed. Two rAFs ensure MathLive has fully painted.
    let raf2: number;
    const raf1 = requestAnimationFrame(() => {
      mf.setValue('0');
      raf2 = requestAnimationFrame(() => {
        const h = mf.offsetHeight;
        if (h > 0) mf.style.minHeight = `${h}px`;
        mf.setValue('');
        mf.focus();
      });
    });

    return () => {
      mf.removeEventListener('change', handleChange);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [ref, onCommit]);

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-card border-t border-b border-border min-h-[60px]">
      <math-field ref={ref} style={{ width: '100%', fontSize: '24px' }} />
      {loading && (
        <span className="shrink-0 w-[18px] h-[18px] rounded-full border-2 border-border border-t-primary animate-spin" />
      )}
    </div>
  );
});

export default MathInput;
