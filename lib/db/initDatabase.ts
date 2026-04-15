import type { SQLiteDatabase } from 'expo-sqlite';

import { runMigrations } from '@/lib/db/migrate';
import { seedDemoTripIfEmpty } from '@/lib/db/seed';

/** Called from SQLiteProvider onInit — single entry for local persistence setup. */
export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await runMigrations(db);
  await seedDemoTripIfEmpty(db);
}
