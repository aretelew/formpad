type FunctionSignature = {
  name: string;
  params: string[];
};

const FUNCTION_SIGNATURES: FunctionSignature[] = [
  { name: 'nCr', params: ['n', 'r'] },
  { name: 'nPr', params: ['n', 'r'] },
  { name: 'mean', params: ['value1', 'value2'] },
  { name: 'stdev', params: ['value1', 'value2'] },
  { name: 'stdevp', params: ['value1', 'value2'] },
  { name: 'round', params: ['value', 'places'] },
  { name: 'floor', params: ['value'] },
  { name: 'ceil', params: ['value'] },
  { name: 'solve', params: ['equation', 'variable'] },
  { name: 'simplify', params: ['expression'] },
  { name: 'factor', params: ['expression'] },
  { name: 'expand', params: ['expression'] },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compactLatex(latex: string) {
  return latex.replace(/\s+/g, '');
}

function escapedOperatorName(name: string) {
  return `\\operatorname{${name}}`;
}

function getTypedNameSuffix(latex: string, name: string) {
  const compact = compactLatex(latex);
  const compactLower = compact.toLowerCase();
  const operatorName = escapedOperatorName(name);
  const operatorNameLower = operatorName.toLowerCase();
  const nameLower = name.toLowerCase();

  if (compactLower.endsWith(operatorNameLower)) return name;
  if (compactLower.endsWith(nameLower)) return name;

  return null;
}

function getCallArgumentText(latex: string, name: string) {
  const compact = compactLatex(latex);
  const escapedName = escapeRegExp(name);
  const functionPattern = `(?:\\\\operatorname\\{${escapedName}\\}|${escapedName})`;
  const callMatch = compact.match(new RegExp(`${functionPattern}(?:\\\\left)?\\((.*?)(?:\\\\right)?\\)?$`, 'i'));
  return callMatch?.[1] ?? null;
}

function formatRemainingCall(signature: FunctionSignature, argsText: string) {
  const argsWithoutRightParen = argsText.replace(/\\right$/, '');
  const hasStartedFirstArg = argsWithoutRightParen.length > 0;
  const commaCount = (argsWithoutRightParen.match(/,/g) ?? []).length;

  if (commaCount >= signature.params.length - 1) return null;

  if (!hasStartedFirstArg) {
    return `${signature.params.join(', ')})`;
  }

  return `, ${signature.params.slice(commaCount + 1).join(', ')})`;
}

export function getFunctionParameterHint(latex: string) {
  if (!latex.trim()) return null;

  for (const signature of FUNCTION_SIGNATURES) {
    const callArgumentText = getCallArgumentText(latex, signature.name);
    if (callArgumentText !== null) {
      return formatRemainingCall(signature, callArgumentText);
    }

    const typedSuffix = getTypedNameSuffix(latex, signature.name);
    if (!typedSuffix) continue;

    const remainingName = signature.name.slice(typedSuffix.length);
    return `${remainingName}(${signature.params.join(', ')})`;
  }

  return null;
}

export const functionOperatorNames = FUNCTION_SIGNATURES.map((signature) => signature.name).join(' ');
