'use client';

import { useState, useRef, useLayoutEffect } from 'react';
import { Undo2, Redo2, ChevronUp } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { FieldHandle } from '@/types/mathfield';

type Tab = 'main' | 'abc' | 'advanced';
type Variant = 'fn' | 'num' | 'op' | 'dark' | 'blue';

interface Props {
  mathfieldRef: React.RefObject<FieldHandle | null>;
  commitRef: React.RefObject<(() => void) | null>;
  angleMode: 'RAD' | 'DEG';
  onAngleModeChange: (mode: 'RAD' | 'DEG') => void;
  onClearHistory: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

// ── MathQuill helpers ────────────────────────────────────────────────────────

function write(mf: FieldHandle | null | undefined, latex: string) {
  mf?.write(latex);
  mf?.focus();
}

function cmd(mf: FieldHandle | null | undefined, command: string) {
  mf?.cmd(command);
  mf?.focus();
}

function keystroke(mf: FieldHandle | null | undefined, key: string) {
  mf?.keystroke(key);
  mf?.focus();
}

function typedText(mf: FieldHandle | null | undefined, text: string) {
  mf?.typedText(text);
  mf?.focus();
}

// ── Key button ───────────────────────────────────────────────────────────────

function Key({
  label,
  onPress,
  variant = 'fn',
  className,
}: {
  label: React.ReactNode;
  onPress: () => void;
  variant?: Variant;
  className?: string;
}) {
  const styles: Record<Variant, string> = {
    fn:   'bg-secondary text-foreground hover:bg-secondary/70',
    num:  'bg-background text-foreground hover:bg-secondary/50 border border-border/60',
    op:   'bg-secondary text-foreground hover:bg-secondary/70',
    dark: 'bg-muted-foreground/15 text-foreground hover:bg-muted-foreground/25',
    blue: 'bg-primary text-primary-foreground hover:bg-primary/85 font-semibold',
  };
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
      className={cn(
        'flex items-center justify-center rounded text-sm select-none cursor-pointer',
        'transition-colors h-11 active:brightness-75',
        styles[variant],
        className,
      )}
    >
      {label}
    </button>
  );
}

function Sup({ children }: { children: React.ReactNode }) {
  return <sup className="text-[0.6em] leading-none">{children}</sup>;
}

function Sub({ children }: { children: React.ReactNode }) {
  return <sub className="text-[0.6em] leading-none">{children}</sub>;
}

function Frac({ num, den }: { num: React.ReactNode; den: React.ReactNode }) {
  return (
    <span className="inline-flex flex-col items-center leading-[1.1] text-[0.78em]">
      <span>{num}</span>
      <span className="border-t border-current px-0.5">{den}</span>
    </span>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Keypad({ mathfieldRef, commitRef, angleMode, onAngleModeChange, onClearHistory, canUndo, canRedo, onUndo, onRedo }: Props) {
  const [tab, setTab] = useState<Tab>('main');
  const [shifted, setShifted] = useState(false);

  const tabButtonRefs = useRef<Map<Tab, HTMLButtonElement>>(new Map());
  const [pillDims, setPillDims] = useState<{ x: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const el = tabButtonRefs.current.get(tab);
    if (el) setPillDims({ x: el.offsetLeft, width: el.offsetWidth });
  }, [tab]);

  const angleButtonRefs = useRef<Map<'RAD' | 'DEG', HTMLButtonElement>>(new Map());
  const [anglePillDims, setAnglePillDims] = useState<{ x: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const el = angleButtonRefs.current.get(angleMode);
    if (el) setAnglePillDims({ x: el.offsetLeft, width: el.offsetWidth });
  }, [angleMode]);

  const mf = () => mathfieldRef.current;

  // ── Toolbar ────────────────────────────────────────────────────────────────

  const toolbar = (
    <div className="flex items-center px-2 py-2 border-b border-border bg-card gap-2.5 text-xs">
      <div className="relative flex rounded overflow-hidden border border-border font-medium text-[10px]">
        {pillDims && (
          <motion.div
            className="absolute top-0 bottom-0 bg-primary"
            animate={{ x: pillDims.x, width: pillDims.width }}
            initial={false}
            transition={{ duration: 0 }}
            style={{ left: 0 }}
          />
        )}
        {(['main', 'abc', 'advanced'] as Tab[]).map((t, i) => (
          <button
            key={t}
            ref={(el) => { if (el) tabButtonRefs.current.set(t, el); else tabButtonRefs.current.delete(t); }}
            onPointerDown={(e) => { e.preventDefault(); setTab(t); }}
            className={cn(
              'relative px-2.5 py-1.5 cursor-pointer z-10',
              i > 0 && 'border-l border-border',
              tab === t ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* RAD / DEG toggle */}
      <div className="relative flex rounded overflow-hidden border border-border font-bold text-[10px]">
        {anglePillDims && (
          <motion.div
            className="absolute top-0 bottom-0 bg-primary"
            animate={{ x: anglePillDims.x, width: anglePillDims.width }}
            initial={false}
            transition={{ duration: 0 }}
            style={{ left: 0 }}
          />
        )}
        {(['RAD', 'DEG'] as const).map((mode, i) => (
          <button
            key={mode}
            ref={(el) => { if (el) angleButtonRefs.current.set(mode, el); else angleButtonRefs.current.delete(mode); }}
            onPointerDown={(e) => { e.preventDefault(); onAngleModeChange(mode); }}
            className={cn(
              'relative px-2.5 py-1.5 cursor-pointer z-10',
              i > 0 && 'border-l border-border',
              angleMode === mode ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Undo / Redo pair */}
      <div className="flex rounded overflow-hidden border border-border text-muted-foreground">
        <button
          onPointerDown={(e) => { e.preventDefault(); onUndo(); }}
          disabled={!canUndo}
          className={cn(
            'px-2.5 py-1.5 transition-colors border-r border-border',
            canUndo ? 'hover:text-foreground hover:bg-secondary/50 cursor-pointer' : 'opacity-35 cursor-not-allowed',
          )}
          aria-label="Undo"
        >
          <Undo2 size={12} />
        </button>
        <button
          onPointerDown={(e) => { e.preventDefault(); onRedo(); }}
          disabled={!canRedo}
          className={cn(
            'px-2.5 py-1.5 transition-colors',
            canRedo ? 'hover:text-foreground hover:bg-secondary/50 cursor-pointer' : 'opacity-35 cursor-not-allowed',
          )}
          aria-label="Redo"
        >
          <Redo2 size={12} />
        </button>
      </div>

      <button
        onPointerDown={(e) => { e.preventDefault(); onClearHistory(); }}
        className="border border-border rounded px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        clear all
      </button>
    </div>
  );

  // ── Main tab ───────────────────────────────────────────────────────────────

  const mainTab = (
    <div className="flex flex-col gap-1 p-1.5">
      {/* Row 1 — powers & roots */}
      <div className="flex gap-1">
        <Key className="flex-1" variant="fn" label={<>a<Sup>2</Sup></>}
          onPress={() => { cmd(mf(), '^'); typedText(mf(), '2'); keystroke(mf(), 'Right'); }} />
        <Key className="flex-1" variant="fn" label={<>a<Sup>b</Sup></>}
          onPress={() => cmd(mf(), '^')} />
        <Key className="flex-1" variant="fn" label="√"
          onPress={() => cmd(mf(), '\\sqrt')} />
        <Key className="flex-1" variant="fn" label={<><Sup>n</Sup>√</>}
          onPress={() => { write(mf(), '\\sqrt[n]{}'); keystroke(mf(), 'Left'); }} />
        <Key className="flex-1" variant="fn" label="│a│"
          onPress={() => { write(mf(), '\\left|\\right|'); keystroke(mf(), 'Left'); }} />
        <Key className="flex-1" variant="fn" label={<span className="italic font-serif text-base">a/b</span>}
          onPress={() => cmd(mf(), '\\frac')} />
        <Key className="flex-1" variant="op" label="×"
          onPress={() => write(mf(), '\\times')} />
        <Key className="flex-1" variant="op" label="÷"
          onPress={() => write(mf(), '\\div')} />
      </div>

      {/* Row 2 — trig */}
      <div className="flex gap-1">
        <Key className="flex-1" variant="fn" label="sin"
          onPress={() => { write(mf(), '\\sin()'); keystroke(mf(), 'Left'); }} />
        <Key className="flex-1" variant="fn" label="cos"
          onPress={() => { write(mf(), '\\cos()'); keystroke(mf(), 'Left'); }} />
        <Key className="flex-1" variant="fn" label="tan"
          onPress={() => { write(mf(), '\\tan()'); keystroke(mf(), 'Left'); }} />
        <Key className="flex-1" variant="fn" label={<>sin<Sup>−1</Sup></>}
          onPress={() => { write(mf(), '\\sin^{-1}()'); keystroke(mf(), 'Left'); }} />
        <Key className="flex-1" variant="fn" label={<>cos<Sup>−1</Sup></>}
          onPress={() => { write(mf(), '\\cos^{-1}()'); keystroke(mf(), 'Left'); }} />
        <Key className="flex-1" variant="fn" label={<>tan<Sup>−1</Sup></>}
          onPress={() => { write(mf(), '\\tan^{-1}()'); keystroke(mf(), 'Left'); }} />
        <Key className="flex-1" variant="op" label="+"
          onPress={() => write(mf(), '+')} />
        <Key className="flex-1" variant="op" label="−"
          onPress={() => write(mf(), '-')} />
      </div>

      {/* Row 3 — log / exp / constants */}
      <div className="flex gap-1">
        <Key className="flex-1" variant="fn" label="ln"
          onPress={() => { write(mf(), '\\ln()'); keystroke(mf(), 'Left'); }} />
        <Key className="flex-1" variant="fn" label="log"
          onPress={() => { write(mf(), '\\log()'); keystroke(mf(), 'Left'); }} />
        <Key className="flex-1" variant="fn" label={<>e<Sup>x</Sup></>}
          onPress={() => { write(mf(), 'e'); cmd(mf(), '^'); }} />
        <Key className="flex-1" variant="fn" label="π"
          onPress={() => write(mf(), '\\pi')} />
        <Key className="flex-1" variant="fn" label="e"
          onPress={() => typedText(mf(), 'e')} />
        <Key className="flex-1" variant="fn" label="!"
          onPress={() => write(mf(), '!')} />
        <Key className="flex-1" variant="fn" label="←"
          onPress={() => keystroke(mf(), 'Left')} />
        <Key className="flex-1" variant="fn" label="→"
          onPress={() => keystroke(mf(), 'Right')} />
      </div>

      {/* Row 4 — delimiters */}
      <div className="flex gap-1">
        <Key className="flex-1" variant="fn" label="("   onPress={() => write(mf(), '(')} />
        <Key className="flex-1" variant="fn" label=")"   onPress={() => write(mf(), ')')} />
        <Key className="flex-1" variant="fn" label="["   onPress={() => write(mf(), '[')} />
        <Key className="flex-1" variant="fn" label="]"   onPress={() => write(mf(), ']')} />
        <Key className="flex-1" variant="fn" label=","   onPress={() => write(mf(), ',')} />
        <Key className="flex-1" variant="fn" label="."   onPress={() => typedText(mf(), '.')} />
        <Key className="flex-1" variant="fn" label="%"   onPress={() => write(mf(), '\\%')} />
        <Key className="flex-1" variant="fn" label="ans" onPress={() => write(mf(), '\\text{ans}')} />
      </div>

      {/* Row 5 — utility + actions */}
      <div className="flex gap-1">
        <Key className="flex-1" variant="fn"   label="∞"
          onPress={() => write(mf(), '\\infty')} />
        <Key className="flex-1" variant="fn"   label={<>10<Sup>x</Sup></>}
          onPress={() => { write(mf(), '10'); cmd(mf(), '^'); }} />
        <Key className="flex-1" variant="fn"   label="nPr"
          onPress={() => { write(mf(), '\\operatorname{nPr}()'); keystroke(mf(), 'Left'); }} />
        <Key className="flex-1" variant="fn"   label="nCr"
          onPress={() => { write(mf(), '\\operatorname{nCr}()'); keystroke(mf(), 'Left'); }} />
        <Key className="flex-1" variant="dark" label="⌫"
          onPress={() => keystroke(mf(), 'Backspace')} />
        <Key className="flex-1" variant="blue" label="↵"
          onPress={() => commitRef.current?.()} />
      </div>
    </div>
  );

  // ── ABC tab ────────────────────────────────────────────────────────────────

  const letter = (c: string) => shifted ? c.toUpperCase() : c;

  const abcTab = (
    <div className="flex flex-col gap-1 p-1.5">
      {/* Number row: 1–9, 0 */}
      <div className="flex gap-1">
        {'1234567890'.split('').map((c) => (
          <Key key={c} className="flex-1" variant="num" label={c}
            onPress={() => typedText(mf(), c)} />
        ))}
      </div>

      {/* Row 1: q w e r t y u i o p */}
      <div className="flex gap-1">
        {'qwertyuiop'.split('').map((c) => (
          <Key key={c} className="flex-1" variant="fn"
            label={<i>{letter(c)}</i>}
            onPress={() => typedText(mf(), letter(c))}
          />
        ))}
      </div>

      {/* Row 2: a s d f g h j k l */}
      <div className="flex gap-1 px-[4.5%]">
        {'asdfghjkl'.split('').map((c) => (
          <Key key={c} className="flex-1" variant="fn"
            label={<i>{letter(c)}</i>}
            onPress={() => typedText(mf(), letter(c))}
          />
        ))}
      </div>

      {/* Row 3: = z x c v b n m _ ⌫ */}
      <div className="flex gap-1">
        {(['=', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '_'] as const).map((c) => (
          <Key key={c} className="flex-1" variant="fn"
            label={<i>{c}</i>}
            onPress={() => typedText(mf(), c)}
          />
        ))}
        <Key className="flex-1" variant="dark" label="⌫"
          onPress={() => keystroke(mf(), 'Backspace')} />
      </div>

      {/* Row 4: ⇧ { } < > * ' ↵ */}
      <div className="flex gap-1">
        <Key
          className="flex-[1.4]"
          variant={shifted ? 'blue' : 'dark'}
          label={<ChevronUp size={14} />}
          onPress={() => setShifted((s) => !s)}
        />
        {(['{', '}', '<', '>', '*'] as const).map((c) => (
          <Key key={c} className="flex-1" variant="fn" label={c}
            onPress={() => typedText(mf(), c)} />
        ))}
        <Key className="flex-1" variant="fn" label="'" onPress={() => typedText(mf(), "'")} />
        <Key className="flex-[1.4]" variant="blue" label="↵"
          onPress={() => commitRef.current?.()} />
      </div>
    </div>
  );

  // ── Advanced tab ───────────────────────────────────────────────────────────

  const advancedTab = (
    <div className="flex flex-col gap-1 p-1.5">
      {/* Row 1 — integrals & derivatives */}
      <div className="flex gap-1">
        <Key className="flex-1" variant="fn"
          label={
            <span className="inline-flex items-center gap-1 font-serif">
              <span className="text-base leading-none">∫</span>
              <span className="italic text-[0.78em] leading-none">dx</span>
            </span>
          }
          onPress={() => { write(mf(), '\\int d'); keystroke(mf(), 'Left'); }}
        />
        <Key className="flex-1" variant="fn"
          label={<>∫<Sub>a</Sub><Sup>b</Sup></>}
          onPress={() => { write(mf(), '\\integral_{}^{} d'); keystroke(mf(), 'Left'); }}
        />
        <Key className="flex-1" variant="fn"
          label={<Frac num="d" den="dx" />}
          onPress={() => write(mf(), '\\frac{d}{d}')}
        />
        <Key className="flex-1" variant="fn"
          label={<Frac num="∂" den="∂x" />}
          onPress={() => write(mf(), '\\frac{\\partial}{\\partial}')}
        />
        <Key className="flex-1" variant="fn"
          label={<Frac num={<>d<Sup>2</Sup></>} den={<>dx<Sup>2</Sup></>} />}
          onPress={() => write(mf(), '\\frac{d^{2}}{d^{2}}')}
        />
        <Key className="flex-1" variant="fn"
          label="lim"
          onPress={() => { write(mf(), '\\lim_{}'); keystroke(mf(), 'Left'); }}
        />
      </div>

      {/* Row 2 — sum, product, CAS operations */}
      <div className="flex gap-1">
        <Key className="flex-1" variant="fn"
          label={<>Σ<Sub>n</Sub></>}
          onPress={() => write(mf(), '\\sum_{}^{}')}
        />
        <Key className="flex-1" variant="fn"
          label={<>Π<Sub>n</Sub></>}
          onPress={() => write(mf(), '\\prod_{}^{}')}
        />
        <Key className="flex-1" variant="fn" label="solve"
          onPress={() => { write(mf(), '\\operatorname{solve}()'); keystroke(mf(), 'Left'); }} />
        <Key className="flex-1" variant="fn" label="simplify"
          onPress={() => { write(mf(), '\\operatorname{simplify}()'); keystroke(mf(), 'Left'); }} />
        <Key className="flex-1" variant="fn" label="factor"
          onPress={() => { write(mf(), '\\operatorname{factor}()'); keystroke(mf(), 'Left'); }} />
        <Key className="flex-1" variant="fn" label="expand"
          onPress={() => { write(mf(), '\\operatorname{expand}()'); keystroke(mf(), 'Left'); }} />
      </div>

      {/* Row 3 — relations & symbols */}
      <div className="flex gap-1">
        <Key className="flex-1" variant="fn" label="→"  onPress={() => write(mf(), '\\to')} />
        <Key className="flex-1" variant="fn" label="≈"  onPress={() => write(mf(), '\\approx')} />
        <Key className="flex-1" variant="fn" label="±"  onPress={() => write(mf(), '\\pm')} />
        <Key className="flex-1" variant="fn" label="≠"  onPress={() => write(mf(), '\\neq')} />
        <Key className="flex-1" variant="fn" label="≤"  onPress={() => write(mf(), '\\leq')} />
        <Key className="flex-1" variant="fn" label="≥"  onPress={() => write(mf(), '\\geq')} />
      </div>

      {/* Row 4 — stats & rounding */}
      <div className="flex gap-1">
        <Key className="flex-1" variant="fn" label="mean"
          onPress={() => { write(mf(), '\\operatorname{mean}()'); keystroke(mf(), 'Left'); }} />
        <Key className="flex-1" variant="fn" label="stdev"
          onPress={() => { write(mf(), '\\operatorname{stdev}()'); keystroke(mf(), 'Left'); }} />
        <Key className="flex-1" variant="fn" label="stdevp"
          onPress={() => { write(mf(), '\\operatorname{stdevp}()'); keystroke(mf(), 'Left'); }} />
        <Key className="flex-1" variant="fn" label="round"
          onPress={() => { write(mf(), '\\operatorname{round}()'); keystroke(mf(), 'Left'); }} />
        <Key className="flex-1" variant="fn" label="floor"
          onPress={() => { write(mf(), '\\operatorname{floor}()'); keystroke(mf(), 'Left'); }} />
        <Key className="flex-1" variant="fn" label="ceil"
          onPress={() => { write(mf(), '\\operatorname{ceil}()'); keystroke(mf(), 'Left'); }} />
      </div>

      {/* Row 5 — greek letters + actions */}
      <div className="flex gap-1">
        <Key className="flex-1" variant="fn"   label="α"  onPress={() => write(mf(), '\\alpha')} />
        <Key className="flex-1" variant="fn"   label="β"  onPress={() => write(mf(), '\\beta')} />
        <Key className="flex-1" variant="fn"   label="θ"  onPress={() => write(mf(), '\\theta')} />
        <Key className="flex-1" variant="fn"   label="λ"  onPress={() => write(mf(), '\\lambda')} />
        <Key className="flex-1" variant="dark" label="⌫"
          onPress={() => keystroke(mf(), 'Backspace')} />
        <Key className="flex-1" variant="blue" label="↵"
          onPress={() => commitRef.current?.()} />
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-card border-t border-border">
      {toolbar}
      {tab === 'main'     && mainTab}
      {tab === 'abc'      && abcTab}
      {tab === 'advanced' && advancedTab}
    </div>
  );
}
