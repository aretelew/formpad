'use client';

import { useState, useRef, useLayoutEffect } from 'react';
import { Undo2, Redo2, ChevronUp } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

type Tab = 'main' | 'abc' | 'advanced';
type Variant = 'fn' | 'num' | 'op' | 'dark' | 'blue';

interface Props {
  mathfieldRef: React.RefObject<any>;
  angleMode: 'RAD' | 'DEG';
  onAngleModeChange: (mode: 'RAD' | 'DEG') => void;
  onClearHistory: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

// ── mathfield helpers ────────────────────────────────────────────────────────

function ins(mf: any, latex: string) {
  mf?.insert(latex, { focus: true, scrollIntoView: true });
}

function execCmd(mf: any, command: string) {
  mf?.executeCommand(command);
  mf?.focus();
}

function commit(mf: any) {
  if (!mf) return;
  // Dispatching 'change' triggers the onCommit handler registered in MathInput
  mf.dispatchEvent(new Event('change', { bubbles: true }));
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

export default function Keypad({ mathfieldRef, angleMode, onAngleModeChange, onClearHistory, canUndo, canRedo, onUndo, onRedo }: Props) {
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
  //
  // 8-wide flat grid. No numpad (physical keyboard). Func merged in.
  //
  //  Row 1: a²  aᵇ  √  ⁿ√  |a|  a/b  ×  ÷
  //  Row 2: sin  cos  tan  sin⁻¹  cos⁻¹  tan⁻¹  +  −
  //  Row 3: ln  log  eˣ  π  e  !  ←  →
  //  Row 4: (  )  ,  .  %  ans  ⌫  ↵

  const mainTab = (
    <div className="flex flex-col gap-1 p-1.5">
      {/* Row 1 — powers & roots */}
      <div className="flex gap-1">
        <Key className="flex-1" variant="fn" label={<>a<Sup>2</Sup></>}                     onPress={() => ins(mf(), '^{2}')} />
        <Key className="flex-1" variant="fn" label={<>a<Sup>b</Sup></>}                     onPress={() => ins(mf(), '^{#?}')} />
        <Key className="flex-1" variant="fn" label="√"                                      onPress={() => ins(mf(), '\\sqrt{#0}')} />
        <Key className="flex-1" variant="fn" label={<><Sup>n</Sup>√</>}                     onPress={() => ins(mf(), '\\sqrt[#?]{#0}')} />
        <Key className="flex-1" variant="fn" label="│a│"                                    onPress={() => ins(mf(), '\\left|#0\\right|')} />
        <Key className="flex-1" variant="fn" label={<span className="italic font-serif text-base">a/b</span>} onPress={() => ins(mf(), '\\frac{#0}{#?}')} />
        <Key className="flex-1" variant="op" label="×"                                      onPress={() => ins(mf(), '\\times')} />
        <Key className="flex-1" variant="op" label="÷"                                      onPress={() => ins(mf(), '\\div')} />
      </div>

      {/* Row 2 — trig */}
      <div className="flex gap-1">
        <Key className="flex-1" variant="fn" label="sin"                                    onPress={() => ins(mf(), '\\sin(#?)')} />
        <Key className="flex-1" variant="fn" label="cos"                                    onPress={() => ins(mf(), '\\cos(#?)')} />
        <Key className="flex-1" variant="fn" label="tan"                                    onPress={() => ins(mf(), '\\tan(#?)')} />
        <Key className="flex-1" variant="fn" label={<>sin<Sup>−1</Sup></>}                  onPress={() => ins(mf(), '\\sin^{-1}(#?)')} />
        <Key className="flex-1" variant="fn" label={<>cos<Sup>−1</Sup></>}                  onPress={() => ins(mf(), '\\cos^{-1}(#?)')} />
        <Key className="flex-1" variant="fn" label={<>tan<Sup>−1</Sup></>}                  onPress={() => ins(mf(), '\\tan^{-1}(#?)')} />
        <Key className="flex-1" variant="op" label="+"                                      onPress={() => ins(mf(), '+')} />
        <Key className="flex-1" variant="op" label="−"                                      onPress={() => ins(mf(), '-')} />
      </div>

      {/* Row 3 — log / exp / constants */}
      <div className="flex gap-1">
        <Key className="flex-1" variant="fn" label="ln"                                     onPress={() => ins(mf(), '\\ln(#?)')} />
        <Key className="flex-1" variant="fn" label="log"                                    onPress={() => ins(mf(), '\\log(#?)')} />
        <Key className="flex-1" variant="fn" label={<>e<Sup>x</Sup></>}                     onPress={() => ins(mf(), 'e^{#?}')} />
        <Key className="flex-1" variant="fn" label="π"                                      onPress={() => ins(mf(), '\\pi')} />
        <Key className="flex-1" variant="fn" label="e"                                      onPress={() => ins(mf(), 'e')} />
        <Key className="flex-1" variant="fn" label="!"                                      onPress={() => ins(mf(), '!')} />
        <Key className="flex-1" variant="fn" label="←"                                     onPress={() => execCmd(mf(), 'moveToPreviousChar')} />
        <Key className="flex-1" variant="fn" label="→"                                     onPress={() => execCmd(mf(), 'moveToNextChar')} />
      </div>

      {/* Row 4 — misc */}
      <div className="flex gap-1">
        <Key className="flex-1" variant="fn" label="("   onPress={() => ins(mf(), '(')} />
        <Key className="flex-1" variant="fn" label=")"   onPress={() => ins(mf(), ')')} />
        <Key className="flex-1" variant="fn" label=","   onPress={() => ins(mf(), ',')} />
        <Key className="flex-1" variant="fn" label="."   onPress={() => ins(mf(), '.')} />
        <Key className="flex-1" variant="fn" label="%"   onPress={() => ins(mf(), '\\%')} />
        <Key className="flex-1" variant="fn" label="ans" onPress={() => ins(mf(), '\\text{ans}')} />
        <Key className="flex-1" variant="fn" label="nPr" onPress={() => ins(mf(), '\\operatorname{nPr}(#?,#?)')} />
        <Key className="flex-1" variant="fn" label="nCr" onPress={() => ins(mf(), '\\operatorname{nCr}(#?,#?)')} />
      </div>

      {/* Row 5 — stats / rounding + actions */}
      <div className="flex gap-1">
        <Key className="flex-1" variant="fn"   label="round"  onPress={() => ins(mf(), '\\operatorname{round}(#?)')} />
        <Key className="flex-1" variant="fn"   label="floor"  onPress={() => ins(mf(), '\\operatorname{floor}(#?)')} />
        <Key className="flex-1" variant="fn"   label="ceil"   onPress={() => ins(mf(), '\\operatorname{ceil}(#?)')} />
        <Key className="flex-1" variant="fn"   label="mean"   onPress={() => ins(mf(), '\\operatorname{mean}(#?)')} />
        <Key className="flex-1" variant="fn"   label="stdev"  onPress={() => ins(mf(), '\\operatorname{stdev}(#?)')} />
        <Key className="flex-1" variant="fn"   label="stdevp" onPress={() => ins(mf(), '\\operatorname{stdevp}(#?)')} />
        <Key className="flex-1" variant="dark" label="⌫"      onPress={() => execCmd(mf(), 'deleteBackward')} />
        <Key className="flex-1" variant="blue" label="↵"      onPress={() => commit(mf())} />
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
          <Key key={c} className="flex-1" variant="num" label={c} onPress={() => ins(mf(), c)} />
        ))}
      </div>

      {/* Row 1: q w e r t y u i o p */}
      <div className="flex gap-1">
        {'qwertyuiop'.split('').map((c) => (
          <Key key={c} className="flex-1" variant="fn"
            label={<i>{letter(c)}</i>}
            onPress={() => ins(mf(), letter(c))}
          />
        ))}
      </div>

      {/* Row 2: a s d f g h j k l (9 keys, slightly indented) */}
      <div className="flex gap-1 px-[4.5%]">
        {'asdfghjkl'.split('').map((c) => (
          <Key key={c} className="flex-1" variant="fn"
            label={<i>{letter(c)}</i>}
            onPress={() => ins(mf(), letter(c))}
          />
        ))}
      </div>

      {/* Row 3: = z x c v b n m , ⌫ */}
      <div className="flex gap-1">
        {(['=', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ','] as const).map((c) => (
          <Key key={c} className="flex-1" variant="fn"
            label={<i>{c}</i>}
            onPress={() => ins(mf(), c)}
          />
        ))}
        <Key className="flex-1" variant="dark" label="⌫" onPress={() => execCmd(mf(), 'deleteBackward')} />
      </div>

      {/* Row 4: ⇧ ( ) [ ] ! ' π ↵ */}
      <div className="flex gap-1">
        <Key
          className="flex-[1.4]"
          variant={shifted ? 'blue' : 'dark'}
          label={<ChevronUp size={14} />}
          onPress={() => setShifted((s) => !s)}
        />
        {(['(', ')', '[', ']', '!'] as const).map((c) => (
          <Key key={c} className="flex-1" variant="fn" label={c} onPress={() => ins(mf(), c)} />
        ))}
        <Key className="flex-1" variant="fn" label="'" onPress={() => ins(mf(), "'")} />
        <Key className="flex-1" variant="fn" label="π" onPress={() => ins(mf(), '\\pi')} />
        <Key className="flex-[1.4]" variant="blue" label="↵" onPress={() => commit(mf())} />
      </div>
    </div>
  );

  // ── Advanced tab (Wolfram Alpha) ───────────────────────────────────────────
  //
  // Layout: flat 6-column grid
  //
  //  Row 1: ∫ dx   ∫ₐᵇ dx   d/dx   ∂/∂x   d²/dx²   lim
  //  Row 2: Σ      Π        solve   simplify  factor  expand
  //  Row 3: ∞      →        ≈       ±         ≠       ·
  //  Row 4: ≤      ≥        Taylor  ←cursor   ⌫       ↵

  const advancedTab = (
    <div className="flex flex-col gap-1 p-1.5">
      {/* Row 1 — integrals & derivatives */}
      <div className="flex gap-1">
        <Key className="flex-1" variant="fn"
          label={<>∫ <span className="italic text-[0.85em]">f</span> d<span className="italic text-[0.85em]">x</span></>}
          onPress={() => ins(mf(), '\\int #? \\, d#?')}
        />
        <Key className="flex-1" variant="fn"
          label={<>∫<Sub>a</Sub><Sup>b</Sup></>}
          onPress={() => ins(mf(), '\\int_{#?}^{#?} #? \\, d#?')}
        />
        <Key className="flex-1" variant="fn"
          label={<Frac num="d" den="dx" />}
          onPress={() => ins(mf(), '\\frac{d}{d#?}\\left(#?\\right)')}
        />
        <Key className="flex-1" variant="fn"
          label={<Frac num="∂" den="∂x" />}
          onPress={() => ins(mf(), '\\frac{\\partial}{\\partial #?}\\left(#?\\right)')}
        />
        <Key className="flex-1" variant="fn"
          label={<Frac num={<>d<Sup>2</Sup></>} den={<>dx<Sup>2</Sup></>} />}
          onPress={() => ins(mf(), '\\frac{d^{2}}{d#?^{2}}\\left(#?\\right)')}
        />
        <Key className="flex-1" variant="fn"
          label="lim"
          onPress={() => ins(mf(), '\\lim_{#? \\to #?} #?')}
        />
      </div>

      {/* Row 2 — sum, product, CAS operations */}
      <div className="flex gap-1">
        <Key className="flex-1" variant="fn"
          label={<>Σ<Sub>n</Sub></>}
          onPress={() => ins(mf(), '\\sum_{#?}^{#?} #?')}
        />
        <Key className="flex-1" variant="fn"
          label={<>Π<Sub>n</Sub></>}
          onPress={() => ins(mf(), '\\prod_{#?}^{#?} #?')}
        />
        <Key className="flex-1" variant="fn" label="solve"    onPress={() => ins(mf(), '\\operatorname{solve}(#?, #?)')} />
        <Key className="flex-1" variant="fn" label="simplify" onPress={() => ins(mf(), '\\operatorname{simplify}(#?)')} />
        <Key className="flex-1" variant="fn" label="factor"   onPress={() => ins(mf(), '\\operatorname{factor}(#?)')} />
        <Key className="flex-1" variant="fn" label="expand"   onPress={() => ins(mf(), '\\operatorname{expand}(#?)')} />
      </div>

      {/* Row 3 — common symbols */}
      <div className="flex gap-1">
        <Key className="flex-1" variant="fn" label="∞"  onPress={() => ins(mf(), '\\infty')} />
        <Key className="flex-1" variant="fn" label="→"  onPress={() => ins(mf(), '\\to')} />
        <Key className="flex-1" variant="fn" label="≈"  onPress={() => ins(mf(), '\\approx')} />
        <Key className="flex-1" variant="fn" label="±"  onPress={() => ins(mf(), '\\pm')} />
        <Key className="flex-1" variant="fn" label="≠"  onPress={() => ins(mf(), '\\neq')} />
        <Key className="flex-1" variant="fn" label="·"  onPress={() => ins(mf(), '\\cdot')} />
      </div>

      {/* Row 4 — relation symbols */}
      <div className="flex gap-1">
        <Key className="flex-1" variant="fn" label="≤"     onPress={() => ins(mf(), '\\leq')} />
        <Key className="flex-1" variant="fn" label="≥"     onPress={() => ins(mf(), '\\geq')} />
        <Key className="flex-1" variant="fn" label="Taylor" onPress={() => ins(mf(), '\\operatorname{taylor}(#?, #?, #?)')} />
        <Key className="flex-1" variant="fn" label="∇"     onPress={() => ins(mf(), '\\nabla')} />
        <Key className="flex-1" variant="fn" label="∬"     onPress={() => ins(mf(), '\\iint_{#?}^{#?} #? \\, d#?\\,d#?')} />
        <Key className="flex-1" variant="fn" label="∮"     onPress={() => ins(mf(), '\\oint #? \\, d#?')} />
      </div>

      {/* Row 5 — greek letters + actions */}
      <div className="flex gap-1">
        <Key className="flex-1" variant="fn"   label="δ"  onPress={() => ins(mf(), '\\delta')} />
        <Key className="flex-1" variant="fn"   label="ε"  onPress={() => ins(mf(), '\\epsilon')} />
        <Key className="flex-1" variant="fn"   label="λ"  onPress={() => ins(mf(), '\\lambda')} />
        <Key className="flex-1" variant="fn"   label="θ"  onPress={() => ins(mf(), '\\theta')} />
        <Key className="flex-1" variant="dark" label="⌫"  onPress={() => execCmd(mf(), 'deleteBackward')} />
        <Key className="flex-1" variant="blue" label="↵"  onPress={() => commit(mf())} />
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
