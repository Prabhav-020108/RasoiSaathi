// SQLite stores the Indian calendar day as a UTC-midnight date label.
export function getTodayUTC(now = new Date()): Date {
  const local = new Date(now.getTime() + (5 * 60 + 30) * 60_000);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}

export function getCurrentMonthKey(date = new Date()): string {
  return getTodayUTC(date).toISOString().slice(0, 7);
}
