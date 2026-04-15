import { formatDecimal, parseDecimal } from '@/lib/money';
import type { Expense, Participant, SettlementTransfer, Trip } from '@/lib/types';

function normCurrency(c: string): string {
  return c.trim().toUpperCase();
}

/** Harcamanın trip ana parasına göre sayısal tutarı; FX eksikse 0. */
export function expenseNumericInBase(e: Expense, tripBase: string): number {
  const t = normCurrency(tripBase);
  const c = normCurrency(e.currency);
  if (c === t) return parseDecimal(e.amount);
  if (e.amountInBase != null && e.amountInBase.trim() !== '') return parseDecimal(e.amountInBase);
  return 0;
}

export function expenseFxMissing(e: Expense, tripBase: string): boolean {
  const t = normCurrency(tripBase);
  const c = normCurrency(e.currency);
  return c !== t && (e.amountInBase == null || e.amountInBase.trim() === '');
}

export function tripSpentTotal(expenses: Expense[], tripBase: string): string {
  let s = 0;
  for (const e of expenses) {
    s += expenseNumericInBase(e, tripBase);
  }
  return formatDecimal(s);
}

export function tripFxMissingCount(expenses: Expense[], tripBase: string): number {
  return expenses.filter((e) => expenseFxMissing(e, tripBase)).length;
}

export function categoryTotalsInBase(
  expenses: Expense[],
  tripBase: string
): { label: string; total: string }[] {
  const map = new Map<string, number>();
  for (const e of expenses) {
    const label = e.category?.trim() || 'Other';
    const v = expenseNumericInBase(e, tripBase);
    map.set(label, (map.get(label) ?? 0) + v);
  }
  return [...map.entries()]
    .map(([label, n]) => ({ label, total: formatDecimal(n) }))
    .sort((a, b) => parseDecimal(b.total) - parseDecimal(a.total));
}

export function paidByTotalsInBase(
  expenses: Expense[],
  tripBase: string
): Record<string, string> {
  const acc: Record<string, number> = {};
  for (const e of expenses) {
    const v = expenseNumericInBase(e, tripBase);
    acc[e.paidBy] = (acc[e.paidBy] ?? 0) + v;
  }
  const out: Record<string, string> = {};
  for (const k of Object.keys(acc)) {
    out[k] = formatDecimal(acc[k]);
  }
  return out;
}

export function topPayerId(totals: Record<string, string>): string | null {
  let best: string | null = null;
  let bestN = -1;
  for (const [id, s] of Object.entries(totals)) {
    const n = parseDecimal(s);
    if (n > bestN) {
      bestN = n;
      best = id;
    }
  }
  return best;
}

export function buildTripShareText(params: {
  trip: Trip;
  participants: Participant[];
  expenses: Expense[];
  ledger: Record<string, string>;
  settlement: SettlementTransfer[];
}): string {
  const { trip, participants, expenses, ledger, settlement } = params;
  const base = trip.baseCurrency;
  const pname = (id: string) => participants.find((p) => p.id === id)?.displayName ?? id;
  const total = tripSpentTotal(expenses, base);
  const fxMiss = tripFxMissingCount(expenses, base);
  const lines: string[] = [];
  lines.push(`SplitTrip — ${trip.name}`);
  if (trip.destination) lines.push(trip.destination);
  if (trip.startDate || trip.endDate) {
    lines.push(`${trip.startDate ?? '?'} → ${trip.endDate ?? '?'}`);
  }
  lines.push('');
  lines.push(`Total spent (${base}): ${total}`);
  if (expenses.length > 0) {
    lines.push(`Expense count: ${expenses.length}`);
  }
  if (fxMiss > 0) {
    lines.push(`Note: ${fxMiss} expense(s) missing base-currency amount; total may be incomplete.`);
  }
  lines.push('');

  const cats = categoryTotalsInBase(expenses, base);
  if (cats.length > 0) {
    lines.push('Categories:');
    for (const c of cats) {
      lines.push(`  • ${c.label}: ${c.total} ${base}`);
    }
    lines.push('');
  }

  const paid = paidByTotalsInBase(expenses, base);
  const top = topPayerId(paid);
  if (top && parseDecimal(paid[top] ?? '0') > 0) {
    lines.push(`Top payer: ${pname(top)} (${paid[top]} ${base})`);
    lines.push('');
  }

  lines.push('Balances (net):');
  const ledgerIds = Object.keys(ledger);
  if (ledgerIds.length === 0) {
    lines.push('  (no data)');
  } else {
    for (const id of ledgerIds) {
      lines.push(`  • ${pname(id)}: ${ledger[id]} ${base}`);
    }
  }
  lines.push('');

  lines.push('Suggested settlement:');
  if (settlement.length === 0) {
    lines.push('  Settled / no transfers needed');
  } else {
    for (const s of settlement) {
      lines.push(`  • ${pname(s.from)} → ${pname(s.to)}: ${s.amountBase} ${base}`);
    }
  }

  lines.push('');
  lines.push('Recent expenses:');
  lines.push(formatRecentExpensesForShare(expenses, trip.baseCurrency, participants, 15));

  lines.push('');
  lines.push('— Generated with SplitTrip');

  return lines.join('\n');
}

const RECENT_LIMIT_DEFAULT = 15;

export type RecentExpenseLineItem = {
  id: string;
  dateLabel: string;
  title: string;
  amountCurrency: string;
  payerName: string;
  /** Yabancı parada ana para notu; aynı parada yok. */
  baseNote?: string;
};

export function recentExpenseLineItems(
  expenses: Expense[],
  tripBase: string,
  participants: Participant[],
  limit = RECENT_LIMIT_DEFAULT
): RecentExpenseLineItem[] {
  const pname = (id: string) => participants.find((p) => p.id === id)?.displayName ?? id;
  const t = tripBase.trim().toUpperCase();
  return expenses.slice(0, limit).map((e) => {
    const c = e.currency.trim().toUpperCase();
    let baseNote: string | undefined;
    if (c !== t) {
      baseNote =
        e.amountInBase != null && e.amountInBase.trim() !== ''
          ? `≈ ${e.amountInBase} ${tripBase.trim().toUpperCase()}`
          : 'FX missing';
    }
    return {
      id: e.id,
      dateLabel: e.occurredAt.length >= 10 ? e.occurredAt.slice(0, 10) : e.occurredAt,
      title: e.title?.trim() || 'Expense',
      amountCurrency: `${e.amount} ${e.currency}`,
      payerName: pname(e.paidBy),
      baseNote,
    };
  });
}

export function formatRecentExpensesForShare(
  expenses: Expense[],
  tripBase: string,
  participants: Participant[],
  limit = RECENT_LIMIT_DEFAULT
): string {
  const items = recentExpenseLineItems(expenses, tripBase, participants, limit);
  if (items.length === 0) return '  (none)';
  const lines = items.map(
    (it) =>
      `  • ${it.dateLabel} · ${it.title} — ${it.amountCurrency} · ${it.payerName}${
        it.baseNote ? ` · ${it.baseNote}` : ''
      }`
  );
  if (expenses.length > limit) {
    lines.push(`  … +${expenses.length - limit} more expense(s)`);
  }
  return lines.join('\n');
}
