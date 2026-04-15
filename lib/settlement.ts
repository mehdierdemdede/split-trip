import type { ParticipantBalance, ParticipantId, SettlementTransfer } from '@/lib/types';
import { formatDecimal, parseDecimal } from '@/lib/money';

/** Net balances → greedy minimum-transfer plan (not unique, but minimal count in typical cases). */
export function settlementFromBalances(
  balances: ParticipantBalance[]
): SettlementTransfer[] {
  const debtors: { id: ParticipantId; owe: number }[] = [];
  const creditors: { id: ParticipantId; receive: number }[] = [];

  for (const b of balances) {
    const n = parseDecimal(b.netBase);
    if (n < -0.005) debtors.push({ id: b.participantId, owe: -n });
    else if (n > 0.005) creditors.push({ id: b.participantId, receive: n });
  }

  debtors.sort((a, b) => b.owe - a.owe);
  creditors.sort((a, b) => b.receive - a.receive);

  const transfers: SettlementTransfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const pay = Math.min(d.owe, c.receive);
    if (pay > 0.005) {
      transfers.push({
        from: d.id,
        to: c.id,
        amountBase: formatDecimal(pay),
      });
    }
    d.owe -= pay;
    c.receive -= pay;
    if (d.owe < 0.01) i++;
    if (c.receive < 0.01) j++;
  }

  return transfers;
}
