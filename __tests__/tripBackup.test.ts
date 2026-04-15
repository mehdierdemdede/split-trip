import { parseTripBackupV1, serializeTripBackupV1, type TripBackupV1 } from '@/lib/tripBackup';

function sampleBackup(): TripBackupV1 {
  return {
    schemaVersion: 1,
    exportedAt: '2026-01-01T00:00:00.000Z',
    app: 'SplitTrip',
    trip: {
      id: 't1',
      name: 'Test Trip',
      baseCurrency: 'EUR',
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      participantIds: ['p1', 'p2'],
    },
    participants: [
      { id: 'p1', displayName: 'Alice', kind: 'active' },
      { id: 'p2', displayName: 'Bob', kind: 'passive' },
    ],
    expenses: [
      {
        id: 'e1',
        tripId: 't1',
        amount: '10.00',
        currency: 'EUR',
        paidBy: 'p1',
        participantIds: ['p1', 'p2'],
        splitMode: 'equal',
        createdAt: '2026-01-01T00:00:00.000Z',
        occurredAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    expenseAudit: [],
  };
}

describe('parseTripBackupV1', () => {
  it('parses valid backup payload', () => {
    const payload = serializeTripBackupV1(sampleBackup());
    const parsed = parseTripBackupV1(payload);
    expect(parsed.trip.id).toBe('t1');
    expect(parsed.participants).toHaveLength(2);
    expect(parsed.expenses).toHaveLength(1);
  });

  it('rejects invalid json', () => {
    expect(() => parseTripBackupV1('{not-json')).toThrow(/valid json/i);
  });

  it('rejects unknown app marker', () => {
    const bad = { ...sampleBackup(), app: 'OtherApp' };
    expect(() => parseTripBackupV1(JSON.stringify(bad))).toThrow(/splittrip backup/i);
  });

  it('rejects expense payer outside participant list', () => {
    const bad = sampleBackup();
    bad.expenses = [{ ...bad.expenses[0], paidBy: 'p3' }];
    expect(() => parseTripBackupV1(JSON.stringify(bad))).toThrow(/payer/i);
  });

  it('rejects expense split participant outside participant list', () => {
    const bad = sampleBackup();
    bad.expenses = [{ ...bad.expenses[0], participantIds: ['p1', 'p3'] }];
    expect(() => parseTripBackupV1(JSON.stringify(bad))).toThrow(/unknown participant/i);
  });
});
