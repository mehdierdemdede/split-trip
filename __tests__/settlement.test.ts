import { settlementFromBalances } from '@/lib/settlement';

describe('settlementFromBalances', () => {
  it('settles simple debtor/creditor pair', () => {
    const transfers = settlementFromBalances([
      { participantId: 'a', netBase: '-50.00' },
      { participantId: 'b', netBase: '50.00' },
    ]);
    expect(transfers).toHaveLength(1);
    expect(transfers[0]).toMatchObject({
      from: 'a',
      to: 'b',
      amountBase: '50.00',
    });
  });

  it('returns empty when balanced', () => {
    const transfers = settlementFromBalances([
      { participantId: 'a', netBase: '0.00' },
      { participantId: 'b', netBase: '0.00' },
    ]);
    expect(transfers).toHaveLength(0);
  });
});
