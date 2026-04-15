/** Stable random IDs for local rows (sync-ready). */
export function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}
