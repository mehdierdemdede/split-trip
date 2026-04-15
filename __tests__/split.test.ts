import { ledgerFromExpenses, sharesForExpense, validateCustomSplit } from '@/lib/split';
import type { Expense, ParticipantId } from '@/lib/types';

const p1 = 'p1' as ParticipantId;
const p2 = 'p2' as ParticipantId;

function exp(partial: Partial<Expense> & Pick<Expense, 'id' | 'amount' | 'currency' | 'paidBy'>): Expense {
  return {
    tripId: 't1',
    participantIds: [p1, p2],
    splitMode: 'equal',
    occurredAt: '2026-01-01',
    createdAt: '2026-01-01T00:00:00Z',
    title: 'x',
    ...partial,
  } as Expense;
}

describe('sharesForExpense', () => {
  it('splits equally between two', () => {
    const e = exp({
      id: 'e1',
      amount: '100.00',
      currency: 'EUR',
      paidBy: p1,
      participantIds: [p1, p2],
      splitMode: 'equal',
    });
    const s = sharesForExpense(e);
    expect(s[p1]).toBe('50.00');
    expect(s[p2]).toBe('50.00');
  });
});

describe('validateCustomSplit', () => {
  it('accepts when sum matches amount', () => {
    const e = exp({
      id: 'e1',
      amount: '30.00',
      currency: 'EUR',
      paidBy: p1,
      splitMode: 'custom',
      customSplit: { [p1]: '10.00', [p2]: '20.00' },
    });
    expect(validateCustomSplit(e)).toBe(true);
  });

  it('rejects when sum drifts', () => {
    const e = exp({
      id: 'e1',
      amount: '30.00',
      currency: 'EUR',
      paidBy: p1,
      splitMode: 'custom',
      customSplit: { [p1]: '10.00', [p2]: '10.00' },
    });
    expect(validateCustomSplit(e)).toBe(false);
  });
});

describe('ledgerFromExpenses', () => {
  it('nets to zero for single equal split in base currency', () => {
    const expenses = [
      exp({
        id: 'e1',
        amount: '100.00',
        currency: 'EUR',
        paidBy: p1,
        participantIds: [p1, p2],
      }),
    ];
    const ledger = ledgerFromExpenses(expenses, 'EUR', {});
    const n1 = parseFloat(ledger[p1] ?? '0');
    const n2 = parseFloat(ledger[p2] ?? '0');
    expect(Math.abs(n1 + n2)).toBeLessThan(0.02);
  });

  it('uses amount_in_base override for foreign currency', () => {
    const expenses = [
      exp({
        id: 'e1',
        amount: '100.00',
        currency: 'USD',
        paidBy: p1,
        participantIds: [p1, p2],
      }),
    ];
    const ledger = ledgerFromExpenses(expenses, 'EUR', { e1: '90.00' });
    expect(ledger[p1]).toBeDefined();
    expect(ledger[p2]).toBeDefined();
  });

  it('throws when FX missing for foreign expense', () => {
    const expenses = [
      exp({
        id: 'e1',
        amount: '100.00',
        currency: 'USD',
        paidBy: p1,
        participantIds: [p1, p2],
      }),
    ];
    expect(() => ledgerFromExpenses(expenses, 'EUR', {})).toThrow(/Missing base amount/);
  });
});
