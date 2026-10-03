import { LogEntry, DamageRecord, RestockEntry, InventoryItem } from "../types";

// ─── Monthly report (Reports page + Dashboard "Export Report") ───────────────
// Answers two questions for a month:
//   1. Used: how much material was pulled out, and what was it worth?
//      (cost = item's pack price / units per pack, saved at pull-out time)
//   2. Bought: how much was restocked, and what was paid?
//      (price entered in the Restock popup, prefilled from the pack price)

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
  restocked: MaterialUsage[];
  restockCost: number; // pesos spent on restocks this month
}

export function buildMonthlyUsage(
  logs: LogEntry[],
  damageRecords: DamageRecord[],
  restocks: RestockEntry[],
  items: InventoryItem[],
  year: number,
  month: number,
): MonthlyUsage {
  const rmap = new Map<string, MaterialUsage>();
  restocks
    .filter((r) => sameMonth(r.date, year, month))
    .forEach((r) => {
      const unit = items.find((i) => i.id === r.itemId)?.unit || "";
      const key = `${r.item}|${unit}`;
      const m = rmap.get(key) || { item: r.item, unit, qty: 0, times: 0, cost: 0 };
      m.qty += r.qty;
      m.times += 1;
      m.cost += r.cost || 0;
      rmap.set(key, m);
    });
  const restocked = [...rmap.values()].sort((a, b) => b.cost - a.cost || b.qty - a.qty);

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
    restocked,
    restockCost: restocked.reduce((s, m) => s + m.cost, 0),
  };
}

function esc(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function usageToCSV(u: MonthlyUsage): string {
  const lines: string[] = [];
  const row = (...v: (string | number)[]) => lines.push(v.map(esc).join(","));
  row("Monthly report", u.label);
  row("Used (pull-outs and repairs), PHP", u.totalCost.toFixed(2));
  row("Bought (restocks), PHP", u.restockCost.toFixed(2));
  row("");
  row("MATERIALS USED");
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
  row("TOTAL USED", "", "", "", u.totalCost.toFixed(2));
  row("");
  row("RESTOCKED (BOUGHT)");
  row("Item", "Amount added", "Unit", "Times restocked", "Price paid (PHP)");
  u.restocked.forEach((m) => row(m.item, m.qty, m.unit, m.times, m.cost ? m.cost.toFixed(2) : "No price entered"));
  row("TOTAL BOUGHT", "", "", "", u.restockCost.toFixed(2));
  return lines.join("\n");
}
