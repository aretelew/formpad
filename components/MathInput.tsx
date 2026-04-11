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

    const handleChange = () => {
      const latex: string = mf.getValue('latex');
      if (latex.trim()) {
        onCommit(latex);
        mf.setValue('');
        mf.focus();
      }
    };

    mf.addEventListener('change', handleChange);
    return () => mf.removeEventListener('change', handleChange);
  }, [ref, onCommit]);

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-[#252525] border-t border-b border-[#333333] min-h-[60px]">
      <math-field ref={ref} style={{ width: '100%', fontSize: '24px' }} />
      {loading && (
        <span className="shrink-0 w-[18px] h-[18px] rounded-full border-2 border-[#333333] border-t-[#2b7fff] animate-spin" />
      )}
    </div>
  );
});

export default MathInput;
