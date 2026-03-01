export function getWeekStartUTC(date = new Date()): Date {
  const weekStart = new Date(date);
  weekStart.setUTCHours(0, 0, 0, 0);

  const day = weekStart.getUTCDay();
  const daysFromMonday = (day + 6) % 7;
  weekStart.setUTCDate(weekStart.getUTCDate() - daysFromMonday);

  return weekStart;
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
