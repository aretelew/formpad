# AI Scientific Calculator — Build Plan

## Overview

A Desmos-style scientific calculator with:
- Beautiful LaTeX math rendering and live evaluation (Compute Engine)
- Fallback to Wolfram Alpha for hard symbolic problems
- Claude AI for step-by-step explanations on demand
- History of past calculations (like the Desmos scientific calculator)

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Math input & rendering | MathLive (`<math-field>`) | Same rendering approach as Desmos — fractions, exponents, LaTeX font out of the box |
| Live evaluation (basic) | Compute Engine (`@cortex-js/compute-engine`) | In-browser, instant, no API call for common math |
| Symbolic fallback | Wolfram Alpha Full Results API | Handles integrals, ODEs, series, anything CE fails |
| AI explanations | Anthropic Claude API (`claude-sonnet-4-6`) | Streaming step-by-step explanations, extended thinking for hard problems |
| Frontend framework | Next.js (App Router) + React | API routes built in — no separate backend needed; React simplifies history/panel state |
| API proxy (built-in) | Next.js Route Handlers (`/app/api/`) | Wolfram & Claude API keys stay server-side; no Express, no vercel.json needed |
| Deployment | Vercel (free Hobby tier) | Native Next.js support, serverless functions included free |

---

## Architecture

```
Browser
  |
  |-- MathLive <math-field>
  |     |-- fires `input` event on every keystroke
  |     |-- outputs current expression as LaTeX string
  |
  |-- Evaluation Pipeline
  |     |
  |     Step 1: Compute Engine (in-browser, instant)
  |     |   ce.parse(latex).evaluate()
  |     |   -> Success: display result immediately
  |     |   -> Null/error: proceed to Step 2
  |     |
  |     Step 2: Wolfram Alpha (via proxy, on Enter or debounce)
  |         POST /api/wolfram { query: latex }
  |         -> Backend calls Wolfram Full Results API
  |         -> Returns result pod + step-by-step pod
  |         -> Display result; show "Explain" button
  |
  |-- Explain Button (optional, per calculation)
        POST /api/explain { expression: latex, result: string }
        -> Backend calls Claude API with streaming
        -> Streams explanation token by token into a panel
```

---

## File Structure

```
calculator/
  app/
    layout.tsx                  # Root layout (fonts, global styles)
    page.tsx                    # Main calculator page (server component shell)
    globals.css                 # Global styles
    api/
      wolfram/
        route.ts                # POST handler — Wolfram Alpha proxy
      explain/
        route.ts                # POST handler — Claude API streaming proxy
  components/
    Calculator.tsx              # Root client component ('use client')
    HistoryArea.tsx             # Scrollable history list
    HistoryRow.tsx              # Single history entry (expression + result + buttons)
    MathInput.tsx               # MathLive <math-field> wrapper
    Keypad.tsx                  # Custom virtual keyboard (main/abc/func tabs)
    ExplanationPanel.tsx        # Sliding AI explanation panel (streaming)
    RadDegToggle.tsx            # RAD/DEG mode toggle
  lib/
    computeEngine.ts            # CE setup and evaluation helper
    wolframClient.ts            # fetch() wrapper for /api/wolfram
    explainClient.ts            # SSE streaming wrapper for /api/explain
    hardPatterns.ts             # Regex patterns for known-hard expressions
  PLAN.md                       # This file
  .env.local                    # WOLFRAM_APP_ID, ANTHROPIC_API_KEY (never committed)
  .env.example                  # Template showing required env vars
  package.json
  next.config.ts                # Next.js config
  tsconfig.json
```

---

## UI Design

Mimicking Desmos Scientific Calculator exactly:

```
+--------------------------------------------------+
|  HISTORY AREA (scrollable)                       |
|  2^3 / 2                              = 4        |
|  2^3                                  = 8        |
|  3424^2                        = 11723776        |
|  24 + 523                            = 547       |
|  9 * 2                                = 18       |
|  [Wolfram result shown differently]   ~ symbol   |
+--------------------------------------------------+
|  ACTIVE INPUT (MathLive math-field)              |
|  2 + |                                           |
+--------------------------------------------------+
|  [main] [abc] [func]   [RAD] [DEG]  undo redo   |
|  a^2   a^b   |a|    7   8   9   /   %   a/b      |
|  sqrt  n-rt  pi    4   5   6   x   <-  ->        |
|  sin   cos   tan   1   2   3   -       [del]     |
|  (     )     ,     0   .  ans  +       [Enter]   |
+--------------------------------------------------+
```

### Keyboard Tabs
- **main** — numbers, basic ops, trig, sqrt, pi, fractions, abs
- **abc** — variables (x, y, n, a, b, t, theta)
- **func** — log, ln, floor, ceil, round, factorial, combinations

### History Area
- Each row: rendered LaTeX expression on the left, `= result` on the right
- Rows from Wolfram Alpha get a small `W` badge
- Each row has an "Explain" button (sparkle icon) that triggers AI explanation
- Clicking a history row re-loads that expression into the input field

### Explanation Panel
- Slides up from the bottom (or opens as a side panel)
- Streams Claude's response token by token
- Uses KaTeX to render any math in the explanation
- Has a "Close" button

---

## Component Breakdown

### 1. Page Shell (`app/page.tsx`)

Server component — just renders the client root. Keeps the server/client boundary clean.

```tsx
// app/page.tsx
import Calculator from '@/components/Calculator';

export default function Page() {
  return <Calculator />;
}
```

### 2. Root Client Component (`components/Calculator.tsx`)

All interactive state lives here.

```tsx
'use client';
import { useState, useRef } from 'react';
import MathInput from './MathInput';
import HistoryArea from './HistoryArea';
import Keypad from './Keypad';
import ExplanationPanel from './ExplanationPanel';
import RadDegToggle from './RadDegToggle';
import { tryComputeEngine } from '@/lib/computeEngine';
import { callWolfram } from '@/lib/wolframClient';
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
  const [explanation, setExplanation] = useState<HistoryEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const mathfieldRef = useRef(null);
  let ans = history[0]?.result ?? '0';

  async function handleCommit(latex: string) {
    if (!latex.trim()) return;
    setLoading(true);

    if (!isKnownHard(latex)) {
      const ceResult = tryComputeEngine(latex, angleMode);
      if (ceResult !== null) {
        addToHistory(latex, String(ceResult), 'ce');
        setLoading(false);
        return;
      }
    }

    const wolframResult = await callWolfram(latex, angleMode);
    addToHistory(latex, wolframResult.result ?? 'Could not solve',
      wolframResult.success ? 'wolfram' : 'error', wolframResult.steps);
    setLoading(false);
  }

  function addToHistory(latex: string, result: string, source: HistoryEntry['source'], steps?: string | null) {
    setHistory(prev => [{ id: Date.now(), latex, result, source, steps }, ...prev]);
  }

  return (
    <div className="calculator">
      <HistoryArea history={history} onExplain={setExplanation} onReload={/* set mathfield value */} />
      <MathInput ref={mathfieldRef} onCommit={handleCommit} angleMode={angleMode} loading={loading} />
      <div className="keypad-header">
        <RadDegToggle value={angleMode} onChange={setAngleMode} />
      </div>
      <Keypad mathfieldRef={mathfieldRef} />
      {explanation && <ExplanationPanel entry={explanation} onClose={() => setExplanation(null)} />}
    </div>
  );
}
```

### 3. MathLive Input (`components/MathInput.tsx`)

```tsx
'use client';
import { useEffect, useRef, forwardRef } from 'react';
import 'mathlive';

export default forwardRef(function MathInput({ onCommit, loading }, ref) {
  const mfRef = useRef<any>(null);

  useEffect(() => {
    const mf = mfRef.current;
    if (!mf) return;

    mf.mathVirtualKeyboardPolicy = 'manual';
    window.mathVirtualKeyboard.show();

    // Live result shown as user types
    mf.addEventListener('input', () => {
      // parent handles live result via CE — see Calculator.tsx
    });

    // Enter commits
    mf.addEventListener('change', () => {
      const latex = mf.getValue('latex');
      onCommit(latex);
      mf.setValue('');
    });
  }, []);

  return (
    <div className="math-input-row">
      <math-field ref={mfRef} style={{ width: '100%' }} />
      {loading && <span className="loading-spinner" />}
    </div>
  );
});
```

### 4. Wolfram Alpha Route Handler (`app/api/wolfram/route.ts`)

Next.js App Router uses `Response` objects — no `req/res` like Express.

```ts
// app/api/wolfram/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { query, angleMode } = await req.json();
  const appId = process.env.WOLFRAM_APP_ID;

  const input = angleMode === 'DEG' ? `${query} assuming degrees` : query;

  const url = new URL('https://api.wolframalpha.com/v2/query');
  url.searchParams.set('input', input);
  url.searchParams.set('appid', appId!);
  url.searchParams.set('output', 'json');
  url.searchParams.set('format', 'plaintext');
  url.searchParams.set('podstate', 'Result__Step-by-step+solution');

  const response = await fetch(url.toString());
  const data = await response.json();

  const pods = data?.queryresult?.pods ?? [];
  const resultPod = pods.find((p: any) => p.id === 'Result');
  const result = resultPod?.subpods?.[0]?.plaintext ?? null;
  const steps = resultPod?.subpods?.[1]?.plaintext ?? null;

  return NextResponse.json({ result, steps, success: !!result });
}
```

### 5. Claude Explanation Route Handler (`app/api/explain/route.ts`)

Next.js App Router streaming uses `ReadableStream` + `Response`.

```ts
// app/api/explain/route.ts
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const { expression, result, steps } = await req.json();
  const client = new Anthropic();

  const prompt = steps
    ? `A user computed: ${expression} = ${result}.\n\nThe step-by-step solution is:\n${steps}\n\nPlease explain this solution clearly, step by step, as if teaching a student.`
    : `A user computed: ${expression} = ${result}. Please explain how to solve this problem step by step.`;

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta') {
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
          );
        }
      }
      controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
```

### 6. Custom Keyboard Layout (main tab, Desmos-style)

```js
window.mathVirtualKeyboard.layouts = [
  {
    label: 'main',
    rows: [
      [
        { latex: 'a^2', insert: '#@^{2}' },
        { latex: 'a^b', insert: '#@^{#?}' },
        { latex: '|a|', insert: '\\left|#0\\right|' },
        '[7]', '[8]', '[9]',
        { latex: '\\div', insert: '\\div' },
        { latex: '\\%', insert: '\\%' },
        { latex: '\\frac{a}{b}', insert: '\\frac{#@}{#?}' },
      ],
      [
        { latex: '\\sqrt{}', insert: '\\sqrt{#0}' },
        { latex: '\\sqrt[n]{}', insert: '\\sqrt[#?]{#0}' },
        { latex: '\\pi', insert: '\\pi' },
        '[4]', '[5]', '[6]',
        { latex: '\\times', insert: '\\times' },
        '[left]', '[right]',
      ],
      [
        { latex: '\\sin', insert: '\\sin(#0)' },
        { latex: '\\cos', insert: '\\cos(#0)' },
        { latex: '\\tan', insert: '\\tan(#0)' },
        '[1]', '[2]', '[3]',
        { latex: '-', insert: '-' },
        { label: '[backspace]', width: 2 },
      ],
      [
        { latex: '(', insert: '(' },
        { latex: ')', insert: ')' },
        { latex: ',', insert: ',' },
        '[0]', '[.]',
        { latex: '\\text{ans}', command: 'insertAns' },
        { latex: '+', insert: '+' },
        { label: '[action]', width: 3 },  // Enter key
      ],
    ]
  },
  {
    label: 'abc',
    rows: [
      ['x', 'y', 'n', 'a', 'b', 'c', 't'],
      [
        { latex: '\\theta', insert: '\\theta' },
        { latex: '\\alpha', insert: '\\alpha' },
        { latex: '\\beta', insert: '\\beta' },
        { latex: '\\lambda', insert: '\\lambda' },
      ],
      ['[left]', '[right]', '[backspace]'],
    ]
  },
  {
    label: 'func',
    rows: [
      [
        { latex: '\\log', insert: '\\log(#0)' },
        { latex: '\\ln', insert: '\\ln(#0)' },
        { latex: '\\log_{b}', insert: '\\log_{#?}(#0)' },
        { latex: 'e^x', insert: 'e^{#0}' },
      ],
      [
        { latex: '\\lfloor x \\rfloor', insert: '\\lfloor #0 \\rfloor' },
        { latex: '\\lceil x \\rceil', insert: '\\lceil #0 \\rceil' },
        { latex: 'n!', insert: '#@!' },
        { latex: '\\binom{n}{k}', insert: '\\binom{#?}{#?}' },
      ],
      [
        { latex: '\\int', insert: '\\int #0 \\,d#?' },
        { latex: '\\int_a^b', insert: '\\int_{#?}^{#?} #0 \\,d#?' },
        { latex: '\\frac{d}{dx}', insert: '\\frac{d}{d#?} #0' },
        { latex: '\\sum', insert: '\\sum_{#?}^{#?} #0' },
      ],
      ['[left]', '[right]', '[backspace]'],
    ]
  }
];
```

---

## Evaluation Decision Logic

```
User presses Enter
        |
        v
Is the LaTeX expression parseable?
  No  -> Show parse error quietly (red outline on input)
  Yes -> Continue
        |
        v
Compute Engine evaluate()
  Success (non-null, non-NaN) -> Add to history, clear input
  Fail                        -> Continue
        |
        v
Is this a "known hard" type? (contains \int, \sum, \frac{d}{dx}, solve, etc.)
  Yes -> Skip CE entirely, go straight to Wolfram (saves time)
  No  -> CE already failed, go to Wolfram anyway
        |
        v
Wolfram Alpha API (via /api/wolfram proxy)
  Success -> Add to history with 'W' badge, show "Explain" button
  Fail    -> Show "Could not solve" message, offer "Ask AI" button
        |
        v
[Optional] User clicks "Explain" or "Ask AI"
        |
        v
Claude API (via /api/explain proxy, streaming)
  Streams explanation into sliding panel
  Renders any math in explanation using KaTeX
```

### Detection of "known hard" expressions

```js
const HARD_PATTERNS = [
  /\\int/,           // integrals
  /\\sum/,           // summations
  /\\prod/,          // products
  /\\frac\{d\}/,     // derivatives (Leibniz notation)
  /\\lim/,           // limits
  /\\infty/,         // infinity
  /\bsolve\b/i,      // equation solving
  /\\begin\{cases\}/, // piecewise / systems
];

function isKnownHard(latex) {
  return HARD_PATTERNS.some(p => p.test(latex));
}
```

---

## History Management

```js
const history = [];   // in-memory; could persist to localStorage

function addToHistory(latex, result, source, steps = null) {
  const entry = { latex, result, source, steps, id: Date.now() };
  history.unshift(entry);  // newest first
  renderHistory();
  ans = result;  // update "ans" variable for next calculation
}
```

Each history entry renders as:
```html
<div class="history-row">
  <div class="expression"><!-- KaTeX rendered latex --></div>
  <div class="result">= 4</div>
  <div class="badges">
    <span class="source-badge wolfram">W</span>  <!-- if from Wolfram -->
    <button class="explain-btn" title="Explain this">✦</button>
  </div>
</div>
```

---

## RAD / DEG Toggle

```js
let angleMode = 'DEG';  // or 'RAD'

// Pass to Compute Engine
ce.set({ angleUnit: angleMode === 'DEG' ? 'deg' : 'rad' });

// Pass to Wolfram via query prefix
const wolframQuery = angleMode === 'DEG'
  ? `${latex} in degrees`
  : latex;
```

---

## Environment Variables

Next.js automatically loads `.env.local` server-side. Variables without the `NEXT_PUBLIC_` prefix are never sent to the browser.

```bash
# .env.local (never committed)
WOLFRAM_APP_ID=your_wolfram_app_id_here
ANTHROPIC_API_KEY=sk-ant-your_key_here
```

```bash
# .env.example (committed)
WOLFRAM_APP_ID=
ANTHROPIC_API_KEY=
```

---

## Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "mathlive": "^0.107.0",
    "@cortex-js/compute-engine": "^0.27.0",
    "@anthropic-ai/sdk": "^0.39.0",
    "katex": "^0.16.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^19.0.0",
    "@types/node": "^22.0.0"
  }
}
```

No `vercel.json` needed — Next.js API routes are automatically recognized and deployed as serverless functions by Vercel.

---

## Build Phases

### Phase 1 — Core Calculator (no AI, no Wolfram)
- [ ] `npx create-next-app@latest` scaffold with TypeScript + App Router
- [ ] `Calculator.tsx` client component with state for history and angle mode
- [ ] `MathInput.tsx` wrapping `<math-field>` with `input` and `change` events
- [ ] Compute Engine wired to `input` event for live results
- [ ] Enter commits expression to history
- [ ] `HistoryArea.tsx` and `HistoryRow.tsx` rendering LaTeX with KaTeX
- [ ] `Keypad.tsx` with custom MathLive layout (main tab only)
- [ ] `RadDegToggle.tsx`
- [ ] "ans" variable support
- [ ] Basic styling matching Desmos aesthetic (`globals.css`)

### Phase 2 — Wolfram Alpha Fallback
- [ ] `app/api/wolfram/route.ts` Next.js Route Handler
- [ ] `lib/hardPatterns.ts` — regex detection of known-hard expressions
- [ ] `lib/wolframClient.ts` — fetch wrapper calling `/api/wolfram`
- [ ] Wolfram result rendering in history with `W` badge
- [ ] Error state when both CE and Wolfram fail
- [ ] Loading spinner during Wolfram call

### Phase 3 — AI Explanations
- [ ] `app/api/explain/route.ts` Next.js Route Handler with streaming
- [ ] `lib/explainClient.ts` — SSE reader consuming the stream
- [ ] "Explain" button on each history row
- [ ] `ExplanationPanel.tsx` — sliding panel with streaming text
- [ ] KaTeX rendering of math inside Claude's response
- [ ] "Ask AI" fallback button when Wolfram also fails

### Phase 4 — Polish
- [ ] abc and func keyboard tabs in `Keypad.tsx`
- [ ] Keyboard tab memory (remembers last active tab)
- [ ] History persistence (`localStorage` via `useEffect`)
- [ ] Responsive layout (works on mobile)
- [ ] Smooth animations (panel slide, history entry fade-in)
- [ ] Proper error messages

---

## Key References

- [MathLive Virtual Keyboard Guide](https://mathlive.io/mathfield/guides/virtual-keyboard/)
- [MathLive Customization Guide](https://mathlive.io/mathfield/guides/customizing/)
- [Compute Engine — Evaluation](https://mathlive.io/compute-engine/guides/evaluate/)
- [Wolfram Alpha Full Results API](https://products.wolframalpha.com/api/documentation)
- [Anthropic Messages API](https://docs.anthropic.com/en/api/messages-streaming)
- [Next.js App Router — Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Next.js Streaming](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#streaming)
- [KaTeX](https://katex.org/)
