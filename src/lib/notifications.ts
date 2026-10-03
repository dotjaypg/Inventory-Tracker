import {
  InventoryItem,
  LogEntry,
  NotificationSettings,
  getStockStatus,
} from "../types";

export type NotificationKind = "overdue" | "out" | "low" | "new";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  page: string; // page to open when the notification is clicked
}

const DAY_MS = 1000 * 60 * 60 * 24;

// "REQ-0012" -> 12. Used to tell which pull-outs are new since last seen.
export function logNumber(logId: string): number {
  const n = parseInt(logId.replace(/\D/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
}

// Whole days since a "YYYY-MM-DD" date, using local time.
export function daysSince(dateStr: string): number {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return 0;
  const start = new Date(y, m - 1, d).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - start) / DAY_MS));
}

export function buildNotifications(
  items: InventoryItem[],
  logs: LogEntry[],
  settings: NotificationSettings,
  opts: { isAdmin: boolean; lastSeenLogNumber: number },
): AppNotification[] {
  const list: AppNotification[] = [];

  if (settings.overdue) {
    logs
      .filter((l) => l.status === "active" && l.needsReturn)
      .map((l) => ({ l, days: daysSince(l.borrowDate) }))
      .filter(({ days }) => days > settings.overdueDays)
      .sort((a, b) => b.days - a.days)
      .forEach(({ l, days }) =>
        list.push({
          id: `overdue-${l.id}`,
          kind: "overdue",
          title: `${l.item} is overdue`,
          detail: `${l.employee} has had it for ${days} days (${l.qty} ${l.unit}, ${l.id})`,
          page: "Requests",
        }),
      );
  }

  if (settings.lowStock) {
    items.forEach((i) => {
      const status = getStockStatus(i);
      if (status === "out") {
        list.push({
          id: `out-${i.id}`,
          kind: "out",
          title: `${i.name} is out of stock`,
          detail: "Restock it so staff can pull it out again.",
          page: "Restock",
        });
      } else if (status === "low") {
        list.push({
          id: `low-${i.id}`,
          kind: "low",
          title: `${i.name} is running low`,
          detail: `${i.stock} ${i.unit} left (alert at ${i.minStock}).`,
          page: "Restock",
        });
      }
    });
  }

  if (settings.newPullOuts && opts.isAdmin) {
    logs
      .filter((l) => logNumber(l.id) > opts.lastSeenLogNumber)
      .sort((a, b) => logNumber(b.id) - logNumber(a.id))
      .forEach((l) =>
        list.push({
          id: `new-${l.id}`,
          kind: "new",
          title: `New ${l.needsReturn ? "borrow" : "pull-out"}: ${l.item}`,
          detail: `${l.qty} ${l.unit} by ${l.employee}${
            l.confirmedBy ? `, confirmed by ${l.confirmedBy}` : ""
          }`,
          page: "Requests",
        }),
      );
  }

  return list;
}
