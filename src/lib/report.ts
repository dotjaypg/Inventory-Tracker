import { LogEntry, DamageRecord } from "../types";

// ─── Monthly usage report (Reports page + Dashboard "Export Report") ─────────
// Answers one question: how much material was used in a month, and what did
// it cost? Cost comes from each item's pack price / units per pack, saved on
// the pull-out at the time it happened.

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : new Date(dateStr);
}

function sameMonth(dateStr: string, year: number, month: number) {
  const d = parseDate(dateStr);
  return d.getFullYear() === year && d.getMonth() === month;
}

export interface MaterialUsage {
  item: string;
  unit: string;
  qty: number; // total amount used this month
  times: number; // number of pull-outs
  cost: number; // pesos
}

export interface MonthlyUsage {
  year: number;
  month: number; // 0-11
  label: string; // "October 2026"
  materials: MaterialUsage[];
  materialsCost: number;
  repairs: DamageRecord[];
  repairsCost: number;
  totalCost: number;
  unpricedCount: number; // materials used that have no price set
}

export function buildMonthlyUsage(
  logs: LogEntry[],
  damageRecords: DamageRecord[],
  year: number,
  month: number,
): MonthlyUsage {
  const map = new Map<string, MaterialUsage>();
  logs
    .filter((l) => !l.needsReturn && sameMonth(l.borrowDate, year, month))
    .forEach((l) => {
      const key = `${l.item}|${l.unit}`;
      const m = map.get(key) || { item: l.item, unit: l.unit, qty: 0, times: 0, cost: 0 };
      m.qty += l.qty;
      m.times += 1;
      m.cost += l.cost;
      map.set(key, m);
    });
  const materials = [...map.values()].sort((a, b) => b.cost - a.cost || b.qty - a.qty);
  const repairs = damageRecords.filter((d) => sameMonth(d.date, year, month));
  const materialsCost = materials.reduce((s, m) => s + m.cost, 0);
  const repairsCost = repairs.reduce((s, d) => s + d.cost, 0);
  return {
    year,
    month,
    label: `${MONTH_NAMES[month]} ${year}`,
    materials,
    materialsCost,
    repairs,
    repairsCost,
    totalCost: materialsCost + repairsCost,
    unpricedCount: materials.filter((m) => m.cost === 0).length,
  };
}

function esc(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function usageToCSV(u: MonthlyUsage): string {
  const lines: string[] = [];
  const row = (...v: (string | number)[]) => lines.push(v.map(esc).join(","));
  row("Monthly usage report", u.label);
  row("");
  row("Item", "Amount used", "Unit", "Times pulled out", "Cost (PHP)");
  u.materials.forEach((m) => row(m.item, m.qty, m.unit, m.times, m.cost ? m.cost.toFixed(2) : "No price set"));
  row("Materials total", "", "", "", u.materialsCost.toFixed(2));
  if (u.repairs.length) {
    row("");
    row("Repairs", "Item", "Logged by", "", "Cost (PHP)");
    u.repairs.forEach((d) => row(d.title, d.item, d.createdBy || "", "", d.cost.toFixed(2)));
    row("Repairs total", "", "", "", u.repairsCost.toFixed(2));
  }
  row("");
  row("TOTAL", "", "", "", u.totalCost.toFixed(2));
  return lines.join("\n");
}
