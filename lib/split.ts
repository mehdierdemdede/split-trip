import type { Expense, ParticipantId, SplitMode } from '@/lib/types';
import { add, formatDecimal, parseDecimal, sub } from '@/lib/money';

/** ledgerFromExpenses için: `amount_in_base` kayıtlı harcamalar. */
export function amountInBaseOverrideMap(expenses: Expense[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const e of expenses) {
    if (e.amountInBase != null && e.amountInBase !== '') {
      m[e.id] = e.amountInBase;
    }
  }
  return m;
}

/** Equal split of `amount` across `ids` (expense currency strings). */
export function equalSplitAmountsForIds(amount: string, ids: ParticipantId[]): Record<ParticipantId, string> {
  if (ids.length === 0) return {};
  const synthetic: Expense = {
    id: '_tmp',
    tripId: '_tmp',
    amount,
    currency: 'EUR',
    paidBy: ids[0],
    participantIds: [...ids],
    splitMode: 'equal',
    occurredAt: '',
    createdAt: '',
  };
  return sharesForExpense(synthetic);
}

export function splitModeForExpense(
  totalParticipants: number,
  includedCount: number,
  isCustom: boolean
): SplitMode {
  if (isCustom) return 'custom';
  if (includedCount < totalParticipants) return 'selected_only';
  return 'equal';
}

/** Per-person share owed for one expense (expense currency). */
export function sharesForExpense(expense: Expense): Record<ParticipantId, string> {
  const ids = expense.participantIds;
  if (ids.length === 0) return {};

  if (expense.splitMode === 'custom') {
    const cs = expense.customSplit ?? {};
    const out: Record<ParticipantId, string> = {};
    for (const id of ids) {
      out[id] = cs[id] ?? '0.00';
    }
    return out;
  }

  const total = parseDecimal(expense.amount);
  const each = total / ids.length;
  const eachStr = formatDecimal(each);
  const out: Record<ParticipantId, string> = {};
  let allocated = 0;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (i === ids.length - 1) {
      const remainder = formatDecimal(total - allocated);
      out[id] = remainder;
    } else {
      out[id] = eachStr;
      allocated += parseDecimal(eachStr);
    }
  }
  return out;
}

/** Validates custom split sums to expense amount (±0.01). */
export function validateCustomSplit(expense: Expense): boolean {
  if (expense.splitMode !== 'custom' || !expense.customSplit) return true;
  let sum = 0;
  for (const id of expense.participantIds) {
    sum += parseDecimal(expense.customSplit[id] ?? '0');
  }
  return Math.abs(sum - parseDecimal(expense.amount)) < 0.02;
}

function scaleShare(share: string, ratio: number): string {
  return formatDecimal(parseDecimal(share) * ratio);
}

/**
 * Running ledger in trip base currency: paid minus owed per participant.
 * If `amountInBaseByExpenseId[e.id]` is set, shares (in expense currency) scale to that base total.
 */
export function ledgerFromExpenses(
  expenses: Expense[],
  tripBaseCurrency: string,
  amountInBaseByExpenseId: Record<string, string> = {}
): Record<ParticipantId, string> {
  const net: Record<ParticipantId, string> = {};

  const bump = (id: ParticipantId, delta: string) => {
    net[id] = net[id] ? add(net[id], delta) : delta;
  };

  for (const e of expenses) {
    const overrideBase = amountInBaseByExpenseId[e.id];
    let totalBase: string;
    let ratio: number;

    if (overrideBase != null && overrideBase !== '') {
      totalBase = overrideBase;
      const orig = parseDecimal(e.amount);
      ratio = orig === 0 ? 1 : parseDecimal(totalBase) / orig;
    } else if (e.currency === tripBaseCurrency) {
      totalBase = e.amount;
      ratio = 1;
    } else {
      throw new Error(`Missing base amount for expense ${e.id} (${e.currency} → ${tripBaseCurrency})`);
    }

    const shares = sharesForExpense(e);
    bump(e.paidBy, totalBase);
    for (const pid of Object.keys(shares)) {
      const shareBase = ratio === 1 ? shares[pid] : scaleShare(shares[pid], ratio);
      bump(pid, sub('0.00', shareBase));
    }
  }

  return net;
}
