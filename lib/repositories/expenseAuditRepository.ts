import type { SQLiteDatabase } from 'expo-sqlite';

import { newId } from '@/lib/ids';

export type ExpenseAuditAction = 'created' | 'updated' | 'deleted';

export interface ExpenseAuditEntry {
  id: string;
  expenseId: string;
  tripId: string;
  action: ExpenseAuditAction;
  createdAt: string;
  meta: Record<string, unknown> | null;
}

interface AuditRow {
  id: string;
  expense_id: string;
  trip_id: string;
  action: string;
  created_at: string;
  meta_json: string | null;
}

export async function appendExpenseAudit(
  db: SQLiteDatabase,
  input: {
    expenseId: string;
    tripId: string;
    action: ExpenseAuditAction;
    meta?: Record<string, unknown>;
  }
): Promise<void> {
  await db.runAsync(
    `INSERT INTO expense_audit (id, expense_id, trip_id, action, created_at, meta_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    newId(),
    input.expenseId,
    input.tripId,
    input.action,
    new Date().toISOString(),
    input.meta ? JSON.stringify(input.meta) : null
  );
}

export async function listExpenseAuditForTrip(
  db: SQLiteDatabase,
  tripId: string
): Promise<ExpenseAuditEntry[]> {
  const rows = await db.getAllAsync<AuditRow>(
    `SELECT id, expense_id, trip_id, action, created_at, meta_json
     FROM expense_audit WHERE trip_id = ?
     ORDER BY created_at ASC`,
    tripId
  );
  return rows.map((r) => ({
    id: r.id,
    expenseId: r.expense_id,
    tripId: r.trip_id,
    action: r.action as ExpenseAuditAction,
    createdAt: r.created_at,
    meta: r.meta_json ? (JSON.parse(r.meta_json) as Record<string, unknown>) : null,
  }));
}

export async function listExpenseAudit(
  db: SQLiteDatabase,
  expenseId: string
): Promise<ExpenseAuditEntry[]> {
  const rows = await db.getAllAsync<AuditRow>(
    `SELECT id, expense_id, trip_id, action, created_at, meta_json
     FROM expense_audit WHERE expense_id = ?
     ORDER BY created_at ASC`,
    expenseId
  );
  return rows.map((r) => ({
    id: r.id,
    expenseId: r.expense_id,
    tripId: r.trip_id,
    action: r.action as ExpenseAuditAction,
    createdAt: r.created_at,
    meta: r.meta_json ? (JSON.parse(r.meta_json) as Record<string, unknown>) : null,
  }));
}
