import { ComputeEngine } from '@cortex-js/compute-engine';

let _ce: ComputeEngine | null = null;

function getCE(): ComputeEngine {
  if (!_ce) _ce = new ComputeEngine();
  return _ce;
}

export function tryComputeEngine(
  latex: string,
  angleMode: 'RAD' | 'DEG'
): string | null {
  try {
    const ce = getCE();

    // Set angle unit
    (ce as any).angularUnit = angleMode === 'DEG' ? 'degree' : 'radian';

    const expr = ce.parse(latex);
    if (!expr.isValid) return null;

    const result = expr.N();
    const val = result.valueOf();

    if (typeof val === 'number') {
      if (!isFinite(val) || isNaN(val)) return null;
      // Trim floating-point noise: up to 10 significant digits
      const formatted = parseFloat(val.toPrecision(10));
      return String(formatted);
    }

    // For non-numeric results (symbolic), return the LaTeX representation
    const latex_out = result.latex;
    if (latex_out && latex_out !== 'Undefined' && latex_out !== 'NaN') {
      return latex_out;
    }

    return null;
  } catch {
    return null;
  }
}
