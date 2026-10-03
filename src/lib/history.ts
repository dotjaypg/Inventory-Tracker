import { LogEntry, RestockEntry } from "../types";

const DAY_MS = 1000 * 60 * 60 * 24;
export const CLEAR_REMINDER_DAYS = 30;

// Decides when to nudge the admin to clear old history.
// Only reminds when there is something to clear AND either:
//   - history was last cleared 30+ days ago, or
//   - history was never cleared and the oldest record is 30+ days old.
// (Before this, a single new pull-out triggered the reminder right away.)
export function getClearReminder(
  lastClearedAt: string | null,
  logs: LogEntry[],
  restocks: RestockEntry[],
) {
  const now = Date.now();
  const daysSinceCleared = lastClearedAt
    ? Math.floor((now - new Date(lastClearedAt).getTime()) / DAY_MS)
    : null;

  const recordTimes = [
    ...logs.map((l) => l.borrowDate),
    ...restocks.map((r) => r.date),
  ]
    .map((d) => new Date(d).getTime())
    .filter((t) => !Number.isNaN(t));

  const oldestRecordDays = recordTimes.length
    ? Math.floor((now - Math.min(...recordTimes)) / DAY_MS)
    : null;

  const hasRecords = recordTimes.length > 0;
  const due =
    hasRecords &&
    (daysSinceCleared !== null
      ? daysSinceCleared >= CLEAR_REMINDER_DAYS
      : (oldestRecordDays ?? 0) >= CLEAR_REMINDER_DAYS);

  return { due, daysSinceCleared, oldestRecordDays };
}
