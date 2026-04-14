'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { EditableMathField } from 'react-mathquill';
import katex from 'katex';
import { Badge } from '@/components/ui/badge';
import { functionOperatorNames, getFunctionParameterHint } from '@/lib/functionHints';
import type { Entry } from './Calculator';
import type { FieldHandle } from '@/types/mathfield';

interface Props {
  entry: Entry;
  deletable: boolean;
  onCommit: (id: number, latex: string) => void;
  onLiveChange: (id: number, latex: string) => void;
  onDelete: (id: number) => void;
  onFocus: (id: number) => void;
  onNavigate: (id: number, direction: 'up' | 'down') => void;
  registerField: (id: number, handle: FieldHandle | null) => void;
}

export default function HistoryRow({
  entry,
  deletable,
  onCommit,
  onLiveChange,
  onDelete,
  onFocus,
  onNavigate,
  registerField,
}: Props) {
  const mfHandleRef = useRef<FieldHandle | null>(null);
  // Prevents edit handler from firing when latex is set programmatically
  const isProgrammaticRef = useRef(false);
  const resultRef = useRef<HTMLSpanElement>(null);
  const [liveLatex, setLiveLatex] = useState(entry.latex);

  // True only for brand-new empty entries that should grab focus on mount
  const shouldFocusOnMountRef = useRef(!entry.result && !entry.latex);

  // Stable callback refs so the one-time config closure never goes stale
  const onCommitRef = useRef(onCommit);
  const onLiveChangeRef = useRef(onLiveChange);
  const onDeleteRef = useRef(onDelete);
  const onNavigateRef = useRef(onNavigate);
  const deletableRef = useRef(deletable);
  useEffect(() => { onCommitRef.current = onCommit; });
  useEffect(() => { onLiveChangeRef.current = onLiveChange; });
  useEffect(() => { onDeleteRef.current = onDelete; });
  useEffect(() => { onNavigateRef.current = onNavigate; });
  useEffect(() => { deletableRef.current = deletable; });

  // Config must be stable — MathQuill re-initialises when it changes.
  // All handlers read from refs so they always call the latest version.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const config = useMemo(() => ({
    autoOperatorNames: `sin cos tan ln log ${functionOperatorNames}`,
    autoCommands: 'pi theta',
    handlers: {
      edit: (_mf: any) => {
        // mf is undefined during MathQuill's own init call; mfHandleRef guards that
        if (isProgrammaticRef.current || !mfHandleRef.current) return;
        const latex = mfHandleRef.current.getLatex();
        setLiveLatex(latex);
        onLiveChangeRef.current(entry.id, latex);
      },
      enter: (_mf: any) => {
        if (!mfHandleRef.current) return;
        onCommitRef.current(entry.id, mfHandleRef.current.getLatex());
      },
      // dir is MathQuill's L (-1) or R (1); check < 0 for left (backspace boundary)
      deleteOutOf: (dir: number, _mf: any) => {
        if (dir < 0 && deletableRef.current) {
          onDeleteRef.current(entry.id);
        }
      },
      upOutOf: () => {
        onNavigateRef.current(entry.id, 'up');
      },
      downOutOf: () => {
        onNavigateRef.current(entry.id, 'down');
      },
    },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMathquillDidMount = (mf: any) => {
    const handle: FieldHandle = {
      focus: () => mf.focus(),
      blur: () => mf.blur(),
      getLatex: () => mf.latex() as string,
      setLatex: (v: string) => {
        isProgrammaticRef.current = true;
        mf.latex(v);
        setLiveLatex(v);
        isProgrammaticRef.current = false;
      },
      keystroke: (key: string) => mf.keystroke(key),
      write: (latex: string) => mf.write(latex),
      cmd: (c: string) => mf.cmd(c),
      typedText: (text: string) => mf.typedText(text),
    };
    mfHandleRef.current = handle;
    registerField(entry.id, handle);

    if (shouldFocusOnMountRef.current) {
      mf.focus();
    }
  };

  // Deregister on unmount
  useEffect(() => {
    return () => {
      registerField(entry.id, null);
    };
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

  useEffect(() => {
    setLiveLatex(entry.latex);
  }, [entry.latex]);

  const parameterHint = getFunctionParameterHint(liveLatex);

  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 border-t border-border min-h-[60px] bg-background"
      onClick={() => mfHandleRef.current?.focus()}
    >
      <div className="flex flex-1 min-w-0 items-center overflow-hidden">
        <EditableMathField
          latex=""
          config={config}
          mathquillDidMount={handleMathquillDidMount}
          onFocus={() => onFocus(entry.id)}
          className="mq-field mq-field-with-hint"
          style={{ fontSize: '20px', minHeight: '1.5em', cursor: 'text' } as React.CSSProperties}
        />
        {parameterHint && (
          <span
            data-parameter-hint
            className="pointer-events-none select-none shrink-0 pl-0.5 text-muted-foreground opacity-80"
            aria-hidden="true"
            style={{ fontSize: '20px' }}
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(
                parameterHint.replace(/[a-zA-Z][a-zA-Z0-9]+/g, m => `\\text{${m}}`),
                { throwOnError: false, displayMode: false, output: 'html' }
              ),
            }}
          />
        )}
      </div>
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
