// ─── Categories ──────────────────────────────────────────────────────────────
// Only 4 real categories now. "marketing" and "production" are grouped under
// the "Materials" dropdown chip in the UI; merch and equipment stand alone.
export type CategoryKey = "marketing" | "production" | "merch" | "equipment";

export const CATEGORIES: Record<
  CategoryKey,
  { label: string; bg: string; text: string; darkBg: string; darkText: string }
> = {
  marketing: { label: "Marketing Materials", bg: "#E6F1FB", text: "#185FA5", darkBg: "#132A3D", darkText: "#7CB8EE" },
  production: { label: "Production Materials", bg: "#E1F5EE", text: "#0F6E56", darkBg: "#0F2C24", darkText: "#5FCDA8" },
  merch: { label: "Merch", bg: "#FAEEDA", text: "#854F0B", darkBg: "#2E2410", darkText: "#E3AE5C" },
  equipment: { label: "Production Equipment", bg: "#FDEAEA", text: "#7A2020", darkBg: "#2E1414", darkText: "#EF9494" },
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
  cost: number; // pesos paid for this restock (0 if not known)
}

// ─── Damage Records ──────────────────────────────────────────────────────────
// Created when a returnable (equipment) item comes back Damaged / Needs repair.
// The repair/damage cost recorded here — NOT the item's full replacement value
// — is what actually counts as a financial loss toward Usage Cost / Value
// Pulled Out. A normal borrow-and-return of equipment in Good condition is
// not a cost event at all.
export interface DamageRecord {
  id: number;
  logId: string | null; // the specific pull-out/return this damage was reported on, if any
  itemId: number | null;
  item: string;
  title: string;
  description: string;
  cost: number;
  date: string;
  receiptUrl: string; // data URL of the uploaded receipt (image or PDF) — required
  createdBy: string | null;
}

// ─── Notification settings (stored in app_settings, shared by everyone) ─────
export interface NotificationSettings {
  lowStock: boolean; // alert when items are low or out of stock
  newPullOuts: boolean; // alert admins about pull-outs they haven't seen yet
  overdue: boolean; // alert when borrowed items are not returned in time
  overdueDays: number; // borrowed items become overdue after this many days
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  lowStock: true,
  newPullOuts: true,
  overdue: true,
  overdueDays: 3,
};
