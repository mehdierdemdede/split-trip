import { normalizeAmountInput } from '@/lib/amountInput';

describe('normalizeAmountInput', () => {
  it('accepts comma decimal input', () => {
    expect(normalizeAmountInput('12,5')).toBe('12.50');
  });

  it('trims and normalizes dot decimal input', () => {
    expect(normalizeAmountInput('  7.2  ')).toBe('7.20');
  });

  it('rejects empty-like values', () => {
    expect(() => normalizeAmountInput('')).toThrow(/valid amount/i);
    expect(() => normalizeAmountInput('.')).toThrow(/valid amount/i);
    expect(() => normalizeAmountInput('-')).toThrow(/valid amount/i);
  });

  it('rejects negative values', () => {
    expect(() => normalizeAmountInput('-3.5')).toThrow(/valid amount/i);
  });
});
