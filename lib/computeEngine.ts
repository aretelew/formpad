import { ComputeEngine } from '@cortex-js/compute-engine';

let _ce: ComputeEngine | null = null;

function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function numVal(arg: any): number | null {
  const v = arg.N().valueOf();
  return typeof v === 'number' && isFinite(v) ? v : null;
}

function getCE(): ComputeEngine {
  if (!_ce) {
    _ce = new ComputeEngine();
    registerCustomFunctions(_ce);
  }
  return _ce;
}

function registerCustomFunctions(ce: ComputeEngine): void {
  // Use ce.assign() for nCr/nPr: unlike ce.declare(), assign() can overwrite
  // symbols the CE auto-declares when parsing, so order doesn't matter.
  // The callback receives an array-like `args` where args[i].valueOf() is numeric.
  (ce as any).assign('nCr', (args: any) => {
    const nv = args[0]?.valueOf?.() as number;
    const rv = args[1]?.valueOf?.() as number;
    if (!Number.isFinite(nv) || !Number.isFinite(rv) || rv < 0 || rv > nv) return ce.symbol('NaN');
    return ce.number(factorial(nv) / (factorial(rv) * factorial(nv - rv)));
  });

  (ce as any).assign('nPr', (args: any) => {
    const nv = args[0]?.valueOf?.() as number;
    const rv = args[1]?.valueOf?.() as number;
    if (!Number.isFinite(nv) || !Number.isFinite(rv) || rv < 0 || rv > nv) return ce.symbol('NaN');
    return ce.number(factorial(nv) / factorial(nv - rv));
  });

  ce.declare('stdev', {
    signature: '(number+) -> number',
    evaluate: (args: any[]) => {
      const vals = args.map(numVal).filter((v): v is number => v !== null);
      if (vals.length < 2) return ce.symbol('NaN');
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
      const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (vals.length - 1);
      return ce.number(Math.sqrt(variance));
    },
  });

  ce.declare('stdevp', {
    signature: '(number+) -> number',
    evaluate: (args: any[]) => {
      const vals = args.map(numVal).filter((v): v is number => v !== null);
      if (vals.length < 1) return ce.symbol('NaN');
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
      const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
      return ce.number(Math.sqrt(variance));
    },
  });
}

export function tryComputeEngine(
  latex: string,
  angleMode: 'RAD' | 'DEG'
): string | null {
  try {
    const ce = getCE();

    // Set angle unit
    (ce as any).angularUnit = angleMode === 'DEG' ? 'deg' : 'rad';

    const expr = ce.parse(latex);
    if (!expr.isValid) return null;

    const result = expr.N();
    const val = result.valueOf();

    if (typeof val === 'number') {
      if (!isFinite(val) || isNaN(val)) return 'Undefined';
      // Trim floating-point noise: up to 10 significant digits
      const formatted = parseFloat(val.toPrecision(10));
      return String(formatted);
    }

    // For non-numeric results (symbolic), return the LaTeX representation
    const latex_out = result.latex;
    if (latex_out && latex_out !== 'Undefined' && latex_out !== 'NaN' && !latex_out.includes('infty')) {
      return latex_out;
    }

    return 'Undefined';
  } catch {
    return null;
  }
}
