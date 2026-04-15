import type { Expense, Participant, Trip } from '@/lib/types';

import type { ExpenseAuditEntry } from '@/lib/repositories/expenseAuditRepository';

/** SplitTrip tek-trip JSON yedeği (şema 1). */
export type TripBackupV1 = {
  schemaVersion: 1;
  exportedAt: string;
  app: 'SplitTrip';
  trip: Trip;
  participants: Participant[];
  expenses: Expense[];
  expenseAudit: ExpenseAuditEntry[];
};

export function buildTripBackupV1(
  trip: Trip,
  participants: Participant[],
  expenses: Expense[],
  expenseAudit: ExpenseAuditEntry[]
): TripBackupV1 {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    app: 'SplitTrip',
    trip,
    participants,
    expenses,
    expenseAudit,
  };
}

export function serializeTripBackupV1(backup: TripBackupV1): string {
  return JSON.stringify(backup, null, 2);
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

export function parseTripBackupV1(raw: string): TripBackupV1 {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('File is not valid JSON.');
  }
  if (!isRecord(data)) throw new Error('Invalid backup file.');

  if (data.schemaVersion !== 1) throw new Error('This backup version is not supported.');
  if (data.app !== 'SplitTrip') throw new Error('Not a SplitTrip backup.');
  if (!isRecord(data.trip)) throw new Error('Missing trip data.');
  const trip = data.trip as unknown as Trip;
  if (!trip.id || typeof trip.name !== 'string' || !trip.baseCurrency) {
    throw new Error('Trip fields are missing or invalid.');
  }

  if (!Array.isArray(data.participants) || data.participants.length === 0) {
    throw new Error('At least one participant is required.');
  }
  const participants = data.participants as unknown as Participant[];

  if (!Array.isArray(data.expenses)) throw new Error('Invalid expense list.');
  const expenses = data.expenses as unknown as Expense[];

  const pidSet = new Set(participants.map((p) => p.id));
  for (const p of participants) {
    if (!p.id || typeof p.displayName !== 'string' || !p.kind) {
      throw new Error('Participant record has missing fields.');
    }
  }

  for (const e of expenses) {
    if (!e.id || e.tripId !== trip.id) {
      throw new Error('Expense does not match trip.');
    }
    if (!pidSet.has(e.paidBy)) throw new Error('Payer is not in backup participants.');
    for (const x of e.participantIds) {
      if (!pidSet.has(x)) throw new Error('Split includes unknown participant.');
    }
  }

  let expenseAudit: ExpenseAuditEntry[] = [];
  if (data.expenseAudit != null) {
    if (!Array.isArray(data.expenseAudit)) throw new Error('Invalid audit list.');
    expenseAudit = data.expenseAudit as unknown as ExpenseAuditEntry[];
    for (const a of expenseAudit) {
      if (!a.id || !a.expenseId || a.tripId !== trip.id) {
        throw new Error('Audit entry does not match trip.');
      }
    }
  }

  return {
    schemaVersion: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    app: 'SplitTrip',
    trip,
    participants,
    expenses,
    expenseAudit,
  };
}
