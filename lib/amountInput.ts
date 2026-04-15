import { formatDecimal, parseDecimal } from '@/lib/money';

/** Accepts "12,50" or "12.5" → "12.50" */
export function normalizeAmountInput(raw: string): string {
  const t = raw.trim().replace(',', '.');
  if (t === '' || t === '.' || t === '-') throw new Error('Enter a valid amount.');
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) throw new Error('Enter a valid amount.');
  return formatDecimal(n);
}
