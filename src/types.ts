// ─── Categories ──────────────────────────────────────────────────────────────
// Only 4 real categories now. "marketing" and "production" are grouped under
// the "Materials" dropdown chip in the UI; merch and equipment stand alone.
export type CategoryKey = "marketing" | "production" | "merch" | "equipment";

export const CATEGORIES: Record<CategoryKey, { label: string; bg: string; text: string }> = {
  marketing: { label: "Marketing Materials", bg: "#E6F1FB", text: "#185FA5" },
  production: { label: "Production Materials", bg: "#E1F5EE", text: "#0F6E56" },
  merch: { label: "Merch", bg: "#FAEEDA", text: "#854F0B" },
  equipment: { label: "Production Equipment", bg: "#FDEAEA", text: "#7A2020" },
};

export type StockStatus = "available" | "low" | "out";

export interface InventoryItem {
  id: number;
  name: string;
  category: CategoryKey;
  stock: number;
  unit: string;
  location: string;
  locker: string; // e.g. "Locker 1", "Locker 2", or "" if not assigned to a locker
  condition: string; // hardware condition, e.g. "Good", "Needs repair"
  lastUpdated: string;
  image: string | null; // data URL from upload, or null for initials avatar
  minStock: number;
  maxStock: number;
  supplier: string;
  description: string;
  packPrice: number; // price of one pack/ream/box, in pesos — 0 if not tracked
  packSize: number; // units per pack, e.g. 500 sheets per ream — 1 if not tracked
  qtyStep: number; // pull-out quantity increment for this item, e.g. 10 for bond paper — default 1
  returnable: boolean; // true = tracked with a borrow/return cycle (equipment); false = pulled-out and consumed (materials)
}

// Cost per single unit (e.g. per sheet), derived from packPrice / packSize.
export function unitCost(item: InventoryItem): number {
  if (!item.packPrice || !item.packSize) return 0;
  return item.packPrice / item.packSize;
}

export function getStockStatus(item: InventoryItem): StockStatus {
  if (item.stock <= 0) return "out";
  if (item.stock <= item.minStock) return "low";
  return "available";
}

// ─── Staff (PIN-based identity) ──────────────────────────────────────────────
export type Role = "admin" | "staff";

export interface Staff {
  id: string;
  name: string;
  role: Role;
}

// ─── Employees ───────────────────────────────────────────────────────────────
export interface Employee {
  id: number;
  name: string;
  dept: string;
  role: string;
  email: string;
}

// ─── Logs (unified borrow / return record, powers both Requests and History) ─
export interface LogEntry {
  id: string;
  itemId: number;
  item: string;
  category: CategoryKey;
  qty: number;
  unit: string;
  employee: string;
  dept: string;
  purpose: string;
  borrowDate: string;
  status: "active" | "returned";
  returnedAt: string | null;
  confirmedBy: string | null; // the staff account logged in when this pull-out was confirmed
  approvedBy: string | null; // the staff account that processed the return
  needsReturn: boolean; // snapshotted from the item's "returnable" setting at the time of pull-out
  conditionOut: string | null; // condition when item was pulled out (returnable items only)
  conditionIn: string | null; // condition when item was returned (returnable items only)
  cost: number; // computed peso cost of this pull-out, snapshotted at time of pull-out — 0 if untracked
}

// ─── Restocks (adding quantity to an EXISTING item — separate from Add Item) ─
export interface RestockEntry {
  id: number;
  itemId: number | null;
  item: string;
  qty: number;
  name: string; // who restocked it
  date: string;
}