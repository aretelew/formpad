const HARD_PATTERNS = [
  /\\int/,
  /\\sum/,
  /\\prod/,
  /\\frac\{d\}/,
  /\\lim/,
  /\\infty/,
  /\bsolve\b/i,
  /\\begin\{cases\}/,
];

export function isKnownHard(latex: string): boolean {
  return HARD_PATTERNS.some((p) => p.test(latex));
}
