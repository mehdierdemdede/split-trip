import type { SQLiteDatabase } from 'expo-sqlite';

const SCHEMA_VERSION = 3;

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const uv = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = uv?.user_version ?? 0;

  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        destination TEXT,
        start_date TEXT,
        end_date TEXT,
        base_currency TEXT NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY NOT NULL,
        trip_id TEXT NOT NULL,
        display_name TEXT NOT NULL,
        kind TEXT NOT NULL,
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_participants_trip ON participants (trip_id);

      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY NOT NULL,
        trip_id TEXT NOT NULL,
        amount TEXT NOT NULL,
        currency TEXT NOT NULL,
        paid_by TEXT NOT NULL,
        participant_ids_json TEXT NOT NULL,
        split_mode TEXT NOT NULL,
        custom_split_json TEXT,
        title TEXT,
        category TEXT,
        note TEXT,
        occurred_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_expenses_trip ON expenses (trip_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_occurred ON expenses (trip_id, occurred_at);
    `);
    version = 1;
  }

  if (version < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS expense_audit (
        id TEXT PRIMARY KEY NOT NULL,
        expense_id TEXT NOT NULL,
        trip_id TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at TEXT NOT NULL,
        meta_json TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_expense_audit_expense ON expense_audit (expense_id);
    `);
    await db.execAsync(`
      INSERT INTO expense_audit (id, expense_id, trip_id, action, created_at, meta_json)
      SELECT lower(hex(randomblob(16))), id, trip_id, 'created', created_at, NULL
      FROM expenses;
    `);
    version = 2;
  }

  if (version < 3) {
    try {
      await db.execAsync(`ALTER TABLE expenses ADD COLUMN amount_in_base TEXT;`);
    } catch {
      /* sütun zaten varsa yoksay */
    }
    version = 3;
  }

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
