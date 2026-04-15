import type { SQLiteDatabase } from 'expo-sqlite';

import { newId } from '@/lib/ids';
import { formatDecimal } from '@/lib/money';
import type { TripBackupV1 } from '@/lib/tripBackup';
import type { Expense, Participant, ParticipantKind, SplitMode, Trip } from '@/lib/types';
import { appendExpenseAudit } from '@/lib/repositories/expenseAuditRepository';

export interface TripSummary extends Trip {
  expenseCount: number;
  /** Trip ana parasına indirgenmiş toplam (eksik FX satırları 0 sayılır). */
  spentInBase: string;
  /** Yabancı para + amount_in_base boş kayıt sayısı. */
  fxIncompleteCount: number;
}

interface TripRow {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  base_currency: string;
  archived: number;
  created_at: string;
}

interface TripListRow extends TripRow {
  expense_count: number;
  spent_base: number;
  fx_gap_count: number;
}

interface ParticipantRow {
  id: string;
  trip_id: string;
  display_name: string;
  kind: string;
}

interface ExpenseRow {
  id: string;
  trip_id: string;
  amount: string;
  currency: string;
  paid_by: string;
  participant_ids_json: string;
  split_mode: string;
  custom_split_json: string | null;
  title: string | null;
  category: string | null;
  note: string | null;
  occurred_at: string;
  created_at: string;
  amount_in_base: string | null;
}

function rowToTrip(r: TripRow, participantIds: string[]): Trip {
  return {
    id: r.id,
    name: r.name,
    destination: r.destination ?? undefined,
    startDate: r.start_date ?? undefined,
    endDate: r.end_date ?? undefined,
    baseCurrency: r.base_currency,
    archived: r.archived === 1,
    createdAt: r.created_at,
    participantIds,
  };
}

function rowToParticipant(r: ParticipantRow): Participant {
  return {
    id: r.id,
    displayName: r.display_name,
    kind: r.kind as ParticipantKind,
  };
}

function rowToExpense(r: ExpenseRow): Expense {
  const participantIds = JSON.parse(r.participant_ids_json) as string[];
  const customSplit = r.custom_split_json
    ? (JSON.parse(r.custom_split_json) as Expense['customSplit'])
    : undefined;
  return {
    id: r.id,
    tripId: r.trip_id,
    amount: r.amount,
    currency: r.currency,
    amountInBase: r.amount_in_base ?? undefined,
    paidBy: r.paid_by,
    participantIds,
    splitMode: r.split_mode as SplitMode,
    customSplit,
    title: r.title ?? undefined,
    category: r.category ?? undefined,
    note: r.note ?? undefined,
    occurredAt: r.occurred_at,
    createdAt: r.created_at,
  };
}

export async function listTripSummaries(
  db: SQLiteDatabase,
  archived: boolean
): Promise<TripSummary[]> {
  const rows = await db.getAllAsync<TripListRow>(
    `SELECT t.id, t.name, t.destination, t.start_date, t.end_date, t.base_currency, t.archived, t.created_at,
            (SELECT COUNT(*) FROM expenses e WHERE e.trip_id = t.id) AS expense_count,
            (SELECT COALESCE(SUM(
              CASE
                WHEN UPPER(TRIM(e.currency)) = UPPER(TRIM(t.base_currency)) THEN CAST(e.amount AS REAL)
                WHEN e.amount_in_base IS NOT NULL AND TRIM(e.amount_in_base) != '' THEN CAST(e.amount_in_base AS REAL)
                ELSE 0
              END
            ), 0) FROM expenses e WHERE e.trip_id = t.id) AS spent_base,
            (SELECT COUNT(*) FROM expenses e
             WHERE e.trip_id = t.id
               AND UPPER(TRIM(e.currency)) != UPPER(TRIM(t.base_currency))
               AND (e.amount_in_base IS NULL OR TRIM(e.amount_in_base) = '')
            ) AS fx_gap_count
     FROM trips t
     WHERE t.archived = ?
     ORDER BY t.created_at DESC`,
    archived ? 1 : 0
  );

  const out: TripSummary[] = [];
  for (const r of rows) {
    const pRows = await db.getAllAsync<ParticipantRow>(
      `SELECT id, trip_id, display_name, kind FROM participants WHERE trip_id = ? ORDER BY display_name`,
      r.id
    );
    const {
      expense_count: expenseCount,
      spent_base: spentBase,
      fx_gap_count: fxGapCount,
      ...tripRow
    } = r;
    const trip = rowToTrip(tripRow, pRows.map((p) => p.id));
    const spentNum = typeof spentBase === 'number' ? spentBase : Number(spentBase) || 0;
    out.push({
      ...trip,
      expenseCount,
      spentInBase: formatDecimal(spentNum),
      fxIncompleteCount: typeof fxGapCount === 'number' ? fxGapCount : Number(fxGapCount) || 0,
    });
  }
  return out;
}

export async function getTripDetail(
  db: SQLiteDatabase,
  tripId: string
): Promise<{ trip: Trip; participants: Participant[]; expenses: Expense[] } | null> {
  const r = await db.getFirstAsync<TripRow>(
    `SELECT id, name, destination, start_date, end_date, base_currency, archived, created_at
     FROM trips WHERE id = ?`,
    tripId
  );
  if (!r) return null;

  const pRows = await db.getAllAsync<ParticipantRow>(
    `SELECT id, trip_id, display_name, kind FROM participants WHERE trip_id = ? ORDER BY display_name`,
    tripId
  );
  const participants = pRows.map(rowToParticipant);

  const eRows = await db.getAllAsync<ExpenseRow>(
    `SELECT id, trip_id, amount, currency, paid_by, participant_ids_json, split_mode, custom_split_json,
            title, category, note, occurred_at, created_at, amount_in_base
     FROM expenses WHERE trip_id = ?
     ORDER BY occurred_at DESC, created_at DESC`,
    tripId
  );

  const trip = rowToTrip(r, participants.map((p) => p.id));
  return {
    trip,
    participants,
    expenses: eRows.map(rowToExpense),
  };
}

export interface NewTripInput {
  name: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  baseCurrency: string;
  /** At least one display name; first = active, rest passive. */
  participantNames: string[];
}

export async function createTripWithParticipants(
  db: SQLiteDatabase,
  input: NewTripInput
): Promise<{ tripId: string }> {
  const names = input.participantNames.map((n) => n.trim()).filter(Boolean);
  if (!input.name.trim()) throw new Error('Trip name is required.');
  if (names.length === 0) throw new Error('Add at least one participant.');

  const tripId = newId();
  const createdAt = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO trips (id, name, destination, start_date, end_date, base_currency, archived, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      tripId,
      input.name.trim(),
      input.destination?.trim() || null,
      input.startDate?.trim() || null,
      input.endDate?.trim() || null,
      input.baseCurrency.trim().toUpperCase() || 'EUR',
      createdAt
    );

    for (let i = 0; i < names.length; i++) {
      const pid = newId();
      const kind: ParticipantKind = i === 0 ? 'active' : 'passive';
      await db.runAsync(
        `INSERT INTO participants (id, trip_id, display_name, kind) VALUES (?, ?, ?, ?)`,
        pid,
        tripId,
        names[i],
        kind
      );
    }
  });

  return { tripId };
}

export async function updateTripDetails(
  db: SQLiteDatabase,
  tripId: string,
  patch: {
    name?: string;
    destination?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }
): Promise<void> {
  const cur = await db.getFirstAsync<TripRow>(
    `SELECT id, name, destination, start_date, end_date, base_currency, archived, created_at FROM trips WHERE id = ?`,
    tripId
  );
  if (!cur) throw new Error('Trip not found.');
  const name = patch.name !== undefined ? patch.name.trim() : cur.name;
  if (!name) throw new Error('Trip name is required.');
  const destination = patch.destination !== undefined ? patch.destination : cur.destination;
  const startDate = patch.startDate !== undefined ? patch.startDate : cur.start_date;
  const endDate = patch.endDate !== undefined ? patch.endDate : cur.end_date;
  await db.runAsync(
    `UPDATE trips SET name = ?, destination = ?, start_date = ?, end_date = ? WHERE id = ?`,
    name,
    destination,
    startDate,
    endDate,
    tripId
  );
}

export async function insertTripParticipant(
  db: SQLiteDatabase,
  input: { tripId: string; displayName: string; kind?: ParticipantKind }
): Promise<{ participantId: string }> {
  const name = input.displayName.trim();
  if (!name) throw new Error('Name is required.');
  const pid = newId();
  const kind: ParticipantKind = input.kind ?? 'passive';
  await db.runAsync(
    `INSERT INTO participants (id, trip_id, display_name, kind) VALUES (?, ?, ?, ?)`,
    pid,
    input.tripId,
    name,
    kind
  );
  return { participantId: pid };
}

export async function insertExpense(db: SQLiteDatabase, e: Expense): Promise<void> {
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
    e.amountInBase ?? null
  );
  await appendExpenseAudit(db, {
    expenseId: e.id,
    tripId: e.tripId,
    action: 'created',
  });
}

export async function setTripArchived(
  db: SQLiteDatabase,
  tripId: string,
  archived: boolean
): Promise<void> {
  await db.runAsync(`UPDATE trips SET archived = ? WHERE id = ?`, archived ? 1 : 0, tripId);
}

/** Trip ve bağlı katılımcı / harcamaları siler (CASCADE). expense_audit FK olmadığı için ayrı temizlenir. */
export async function deleteTrip(db: SQLiteDatabase, tripId: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM expense_audit WHERE trip_id = ?`, tripId);
    await db.runAsync(`DELETE FROM trips WHERE id = ?`, tripId);
  });
}

export async function getExpenseById(
  db: SQLiteDatabase,
  expenseId: string
): Promise<Expense | null> {
  const r = await db.getFirstAsync<ExpenseRow>(
    `SELECT id, trip_id, amount, currency, paid_by, participant_ids_json, split_mode, custom_split_json,
            title, category, note, occurred_at, created_at, amount_in_base
     FROM expenses WHERE id = ?`,
    expenseId
  );
  return r ? rowToExpense(r) : null;
}

export async function updateExpense(db: SQLiteDatabase, e: Expense): Promise<void> {
  await db.runAsync(
    `UPDATE expenses SET
      amount = ?, currency = ?, paid_by = ?, participant_ids_json = ?, split_mode = ?,
      custom_split_json = ?, title = ?, category = ?, note = ?, occurred_at = ?, amount_in_base = ?
     WHERE id = ?`,
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
    e.amountInBase ?? null,
    e.id
  );
  await appendExpenseAudit(db, {
    expenseId: e.id,
    tripId: e.tripId,
    action: 'updated',
  });
}

export async function deleteExpense(db: SQLiteDatabase, expenseId: string): Promise<void> {
  const ex = await getExpenseById(db, expenseId);
  if (!ex) return;
  await appendExpenseAudit(db, {
    expenseId: ex.id,
    tripId: ex.tripId,
    action: 'deleted',
  });
  await db.runAsync(`DELETE FROM expenses WHERE id = ?`, expenseId);
}

/** JSON yedeğinden trip ekler (aynı trip ID zaten varsa hata). */
export async function importTripFromBackup(
  db: SQLiteDatabase,
  backup: TripBackupV1
): Promise<{ tripId: string }> {
  const exists = await db.getFirstAsync<{ id: string }>(`SELECT id FROM trips WHERE id = ?`, backup.trip.id);
  if (exists) {
    throw new Error('This trip ID already exists on the device. Delete it before importing.');
  }

  const pidSet = new Set(backup.participants.map((p) => p.id));
  for (const tid of backup.trip.participantIds ?? []) {
    if (!pidSet.has(tid)) {
      throw new Error('Trip participant list does not match the backup.');
    }
  }

  for (const e of backup.expenses) {
    if (!pidSet.has(e.paidBy)) throw new Error('Payer is not in the backup participants.');
    for (const x of e.participantIds) {
      if (!pidSet.has(x)) throw new Error('Split includes an unknown participant.');
    }
  }

  const audits =
    backup.expenseAudit.length > 0
      ? backup.expenseAudit
      : backup.expenses.map((e) => ({
          id: newId(),
          expenseId: e.id,
          tripId: backup.trip.id,
          action: 'created' as const,
          createdAt: e.createdAt,
          meta: null,
        }));

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO trips (id, name, destination, start_date, end_date, base_currency, archived, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      backup.trip.id,
      backup.trip.name,
      backup.trip.destination ?? null,
      backup.trip.startDate ?? null,
      backup.trip.endDate ?? null,
      backup.trip.baseCurrency,
      backup.trip.archived ? 1 : 0,
      backup.trip.createdAt
    );

    for (const p of backup.participants) {
      await db.runAsync(
        `INSERT INTO participants (id, trip_id, display_name, kind) VALUES (?, ?, ?, ?)`,
        p.id,
        backup.trip.id,
        p.displayName,
        p.kind
      );
    }

    for (const e of backup.expenses) {
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
        e.amountInBase ?? null
      );
    }

    for (const a of audits) {
      await db.runAsync(
        `INSERT INTO expense_audit (id, expense_id, trip_id, action, created_at, meta_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
        a.id,
        a.expenseId,
        a.tripId,
        a.action,
        a.createdAt,
        a.meta ? JSON.stringify(a.meta) : null
      );
    }
  });

  return { tripId: backup.trip.id };
}
