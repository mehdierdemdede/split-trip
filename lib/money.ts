/**
 * Money as decimal strings (e.g. "12.34") to avoid float drift.
 * Replace with a dedicated library (e.g. dinero, big.js) when FX rules grow.
 */

export function parseDecimal(s: string): number {
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Invalid amount: ${s}`);
  return n;
}

export function formatDecimal(n: number, fractionDigits = 2): string {
  return n.toFixed(fractionDigits);
}

export function add(a: string, b: string): string {
  return formatDecimal(parseDecimal(a) + parseDecimal(b));
}

export function sub(a: string, b: string): string {
  return formatDecimal(parseDecimal(a) - parseDecimal(b));
}
