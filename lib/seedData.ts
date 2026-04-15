import type { Expense, Participant, Trip } from '@/lib/types';

/** Bundled demo trip — inserted once when DB has no trips. IDs stable for deep links. */

export const SEED_TRIP_ID = 't1';

export const seedParticipants: Participant[] = [
  { id: 'p1', displayName: 'Alice', kind: 'active' },
  { id: 'p2', displayName: 'Bob', kind: 'active' },
  { id: 'p3', displayName: 'Carol', kind: 'passive' },
];

export const seedTrip: Trip = {
  id: SEED_TRIP_ID,
  name: 'Lisbon weekend',
  destination: 'Lizbon, PT',
  startDate: '2026-04-10',
  endDate: '2026-04-13',
  baseCurrency: 'EUR',
  participantIds: seedParticipants.map((p) => p.id),
  archived: false,
  createdAt: '2026-04-01T10:00:00.000Z',
};

export const seedExpenses: Expense[] = [
  {
    id: 'e1',
    tripId: SEED_TRIP_ID,
    amount: '90.00',
    currency: 'EUR',
    paidBy: 'p1',
    participantIds: ['p1', 'p2', 'p3'],
    splitMode: 'equal',
    title: 'Airbnb',
    category: 'accommodation',
    occurredAt: '2026-04-10T15:00:00.000Z',
    createdAt: '2026-04-10T15:00:00.000Z',
  },
  {
    id: 'e2',
    tripId: SEED_TRIP_ID,
    amount: '45.00',
    currency: 'EUR',
    paidBy: 'p2',
    participantIds: ['p1', 'p2'],
    splitMode: 'equal',
    title: 'Airport taxi',
    category: 'transport',
    occurredAt: '2026-04-10T18:30:00.000Z',
    createdAt: '2026-04-10T18:30:00.000Z',
  },
];

export function participantName(participants: Participant[], id: string): string {
  return participants.find((p) => p.id === id)?.displayName ?? id;
}
