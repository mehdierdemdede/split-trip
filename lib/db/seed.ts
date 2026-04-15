import type { SQLiteDatabase } from 'expo-sqlite';

import { seedExpenses, seedParticipants, seedTrip } from '@/lib/seedData';
import { appendExpenseAudit } from '@/lib/repositories/expenseAuditRepository';

export async function seedDemoTripIfEmpty(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM trips');
  if ((row?.c ?? 0) > 0) return;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO trips (id, name, destination, start_date, end_date, base_currency, archived, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      seedTrip.id,
      seedTrip.name,
      seedTrip.destination ?? null,
      seedTrip.startDate ?? null,
      seedTrip.endDate ?? null,
      seedTrip.baseCurrency,
      seedTrip.archived ? 1 : 0,
      seedTrip.createdAt
    );

    for (const p of seedParticipants) {
      await db.runAsync(
        `INSERT INTO participants (id, trip_id, display_name, kind) VALUES (?, ?, ?, ?)`,
        p.id,
        seedTrip.id,
        p.displayName,
        p.kind
      );
    }

    for (const e of seedExpenses) {
      await db.runAsync(
        `INSERT INTO expenses (
          id, trip_id, amount, currency, paid_by, participant_ids_json, split_mode,
          custom_split_json, title, category, note, occurred_at, created_at, amount_in_base
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        e.id,
        e.tripId,
        e.amount,
        e.currency,
        e.paidBy,
        JSON.stringify(e.participantIds),
        e.splitMode,
        e.customSplit ? JSON.stringify(e.customSplit) : null,
        e.title ?? null,
        e.category ?? null,
        e.note ?? null,
        e.occurredAt,
        e.createdAt,
        null
      );
    }
  });

  for (const e of seedExpenses) {
    await appendExpenseAudit(db, {
      expenseId: e.id,
      tripId: e.tripId,
      action: 'created',
    });
  }
}
