import {
  InventoryItem,
  LogEntry,
  DamageRecord,
  CATEGORIES,
  getStockStatus,
} from "../types";

// ─── Shared report logic used by Reports and the Dashboard "Export Report" ──

export type ReportPeriod = "month" | "3months" | "all";

export const PERIOD_LABELS: Record<ReportPeriod, string> = {
  month: "This month",
  "3months": "Last 3 months",
  all: "All time",
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseDate(dateStr: string): Date {
  // "YYYY-MM-DD" is read as local time so a date never shifts a day.
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : new Date(dateStr);
}

export function periodStart(period: ReportPeriod): Date | null {
  const now = new Date();
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "3months") return new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return null;
}

function inPeriod(dateStr: string | null, period: ReportPeriod): boolean {
  if (!dateStr) return false;
  const start = periodStart(period);
  return start === null || parseDate(dateStr) >= start;
}

export interface Report {
  period: ReportPeriod;
  pullOuts: LogEntry[];
  damage: DamageRecord[];
  materialsCost: number;
  damageCost: number;
  totalCost: number;
  borrowedNow: LogEntry[];
  needsRestock: InventoryItem[];
  mostUsed: { name: string; times: number }[];
  costByItem: { name: string; cost: number }[];
  monthly: { month: string; pullOuts: number; returned: number }[];
  byCategory: { key: keyof typeof CATEGORIES; name: string; value: number }[];
}

export function buildReport(
  items: InventoryItem[],
  logs: LogEntry[],
  damageRecords: DamageRecord[],
  period: ReportPeriod,
): Report {
  const pullOuts = logs.filter((l) => inPeriod(l.borrowDate, period));
  const damage = damageRecords.filter((d) => inPeriod(d.date, period));
  const materialsCost = pullOuts.reduce((s, l) => s + l.cost, 0);
  const damageCost = damage.reduce((s, d) => s + d.cost, 0);

  // "Most used" counts how many times an item was pulled out, so items
  // counted in different units (sheets vs pcs) can be compared fairly.
  const timesMap: Record<string, number> = {};
  pullOuts.forEach((l) => (timesMap[l.item] = (timesMap[l.item] || 0) + 1));
  const mostUsed = Object.entries(timesMap)
    .map(([name, times]) => ({ name, times }))
    .sort((a, b) => b.times - a.times)
    .slice(0, 5);

  const costMap: Record<string, number> = {};
  [...pullOuts.map((l) => ({ item: l.item, cost: l.cost })), ...damage.map((d) => ({ item: d.item, cost: d.cost }))]
    .filter((x) => x.cost > 0)
    .forEach((x) => (costMap[x.item] = (costMap[x.item] || 0) + x.cost));
  const costByItem = Object.entries(costMap)
    .map(([name, cost]) => ({ name, cost }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  // Last 6 months, always (so the chart has context whatever the period).
  const now = new Date();
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { y: d.getFullYear(), m: d.getMonth(), month: MONTH_LABELS[d.getMonth()], pullOuts: 0, returned: 0 };
  });
  const find = (dateStr: string) => {
    const d = parseDate(dateStr);
    return monthly.find((x) => x.y === d.getFullYear() && x.m === d.getMonth());
  };
  logs.forEach((l) => {
    const a = find(l.borrowDate);
    if (a) a.pullOuts++;
    if (l.needsReturn && l.returnedAt) {
      const b = find(l.returnedAt);
      if (b) b.returned++;
    }
  });

  const byCategory = (Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[])
    .map((key) => ({ key, name: CATEGORIES[key].label, value: items.filter((i) => i.category === key).length }))
    .filter((c) => c.value > 0);

  return {
    period,
    pullOuts,
    damage,
    materialsCost,
    damageCost,
    totalCost: materialsCost + damageCost,
    borrowedNow: logs.filter((l) => l.status === "active" && l.needsReturn),
    needsRestock: items
      .filter((i) => getStockStatus(i) !== "available")
      .sort((a, b) => a.stock / Math.max(a.minStock, 1) - b.stock / Math.max(b.minStock, 1)),
    mostUsed,
    costByItem,
    monthly: monthly.map(({ month, pullOuts, returned }) => ({ month, pullOuts, returned })),
    byCategory,
  };
}

function esc(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// A spreadsheet-friendly report (opens in Excel / Google Sheets).
export function reportToCSV(r: Report): string {
  const lines: string[] = [];
  const row = (...v: (string | number)[]) => lines.push(v.map(esc).join(","));
  const peso = (n: number) => n.toFixed(2);

  row("InvenTrack Report");
  row("Period", PERIOD_LABELS[r.period]);
  row("Generated", new Date().toLocaleString());
  row("");
  row("SUMMARY");
  row("Pull-outs", r.pullOuts.length);
  row("Materials cost (PHP)", peso(r.materialsCost));
  row("Damage / repair cost (PHP)", peso(r.damageCost));
  row("Total cost (PHP)", peso(r.totalCost));
  row("Items borrowed right now", r.borrowedNow.length);
  row("Items that need restocking", r.needsRestock.length);
  row("");
  row("MOST USED ITEMS");
  row("Item", "Times pulled out");
  r.mostUsed.forEach((m) => row(m.name, m.times));
  row("");
  row("WHERE THE MONEY GOES");
  row("Item", "Cost (PHP)");
  r.costByItem.forEach((c) => row(c.name, peso(c.cost)));
  row("");
  row("NEEDS RESTOCKING");
  row("Item", "Stock", "Unit", "Alert at");
  r.needsRestock.forEach((i) => row(i.name, i.stock, i.unit, i.minStock));
  row("");
  row("BORROWED RIGHT NOW");
  row("ID", "Item", "Qty", "Unit", "Borrowed by", "Since");
  r.borrowedNow.forEach((l) => row(l.id, l.item, l.qty, l.unit, l.employee, l.borrowDate));
  row("");
  row("ALL PULL-OUTS IN THIS PERIOD");
  row("ID", "Date", "Item", "Qty", "Unit", "Name / Dept.", "Confirmed by", "Purpose", "Status", "Cost (PHP)");
  r.pullOuts.forEach((l) =>
    row(l.id, l.borrowDate, l.item, l.qty, l.unit, l.employee, l.confirmedBy || "", l.purpose, l.needsReturn ? l.status : "used up", peso(l.cost)),
  );
  row("");
  row("DAMAGE RECORDS");
  row("Date", "Item", "Title", "Cost (PHP)", "Logged by");
  r.damage.forEach((d) => row(d.date, d.item, d.title, peso(d.cost), d.createdBy || ""));
  return lines.join("\n");
}
