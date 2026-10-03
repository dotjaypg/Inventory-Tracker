import { InventoryItem, CategoryKey, CATEGORIES } from "../types";

// ─── One shared CSV format for Inventory > Import / Export ───────────────────
// The headers are written in plain words so people can fill the template in
// Excel or Google Sheets without guessing. Older files that use the previous
// short headers ("name", "minStock", ...) are still accepted.

interface ColumnSpec {
  key: keyof ParsedItemRow;
  header: string;
  aliases: string[];
}

const COLUMNS: ColumnSpec[] = [
  { key: "name", header: "Item name", aliases: ["name", "item"] },
  { key: "category", header: "Category", aliases: [] },
  { key: "unit", header: "Counting unit", aliases: ["unit"] },
  { key: "stock", header: "Stock", aliases: ["quantity", "qty"] },
  { key: "minStock", header: "Low stock alert at", aliases: ["minstock", "min stock", "minimum stock"] },
  { key: "returnable", header: "Returnable (yes/no)", aliases: ["returnable", "needs return"] },
  { key: "packPrice", header: "Pack price", aliases: ["packprice", "price"] },
  { key: "packSize", header: "Units per pack", aliases: ["packsize", "pack size"] },
  { key: "qtyStep", header: "Pull out in groups of", aliases: ["qtystep", "step"] },
  { key: "locker", header: "Locker", aliases: ["location"] },
  { key: "supplier", header: "Supplier", aliases: [] },
  { key: "description", header: "Notes", aliases: ["description"] },
];

export const CSV_HEADERS = COLUMNS.map((c) => c.header);

// Example rows in the template carry this note and are skipped on import,
// so it does not matter if someone forgets to delete them.
const EXAMPLE_NOTE = "Example row, skipped on import";

// Accepts the short key ("production") or the full label
// ("Production Materials"), any capitalization.
function toCategory(value: string): CategoryKey | null {
  const v = value.trim().toLowerCase();
  for (const key of Object.keys(CATEGORIES) as CategoryKey[]) {
    if (v === key || v === CATEGORIES[key].label.toLowerCase()) return key;
  }
  return null;
}

export const CATEGORY_HELP = (Object.keys(CATEGORIES) as CategoryKey[])
  .map((k) => CATEGORIES[k].label)
  .join(", ");

function escapeCSVField(value: string | number | boolean): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toLine(values: (string | number | boolean)[]): string {
  return values.map(escapeCSVField).join(",");
}

// ─── Export: current inventory (same columns as the template) ────────────────
export function itemsToCSV(items: InventoryItem[]): string {
  const lines = [toLine(CSV_HEADERS)];
  for (const it of items) {
    lines.push(
      toLine([
        it.name,
        CATEGORIES[it.category].label,
        it.unit,
        it.stock,
        it.minStock,
        it.returnable ? "yes" : "no",
        it.packPrice || "",
        it.packSize > 1 ? it.packSize : "",
        it.qtyStep > 1 ? it.qtyStep : "",
        it.locker,
        it.supplier,
        it.description,
      ]),
    );
  }
  return lines.join("\n");
}

// ─── Template with two example rows (delete them before importing) ──────────
export function csvTemplate(): string {
  return [
    toLine(CSV_HEADERS),
    toLine(["Bond Paper A4", "Production Materials", "sheet", 5000, 1000, "no", 300, 500, 10, "Locker 2", "PaperOne PH", EXAMPLE_NOTE]),
    toLine(["Heat Press Machine", "Production Equipment", "unit", 2, 1, "yes", "", "", "", "Locker 1", "PrintTech Supply", EXAMPLE_NOTE]),
  ].join("\n");
}

// Every exported file is named "<name>-<YYYY-MM-DD>.<ext>", using today's
// local date, e.g. "inventory-2026-10-04.csv". Use this for ALL downloads.
export function datedFilename(name: string, ext = "csv"): string {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `${name}-${date}.${ext}`;
}

export function downloadCSV(filename: string, content: string) {
  // The BOM at the start makes Excel read special characters (like ₱) correctly.
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Minimal CSV parser (handles quoted fields with commas/newlines) ─────────
function parseCSVRaw(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export interface ParsedItemRow {
  name: string;
  category: CategoryKey;
  unit: string;
  stock: number;
  minStock: number;
  maxStock: number;
  returnable: boolean;
  packPrice: number;
  packSize: number;
  qtyStep: number;
  locker: string;
  location: string;
  supplier: string;
  description: string;
}

export interface RowProblem {
  row: number; // spreadsheet row number (header is row 1)
  name: string;
  message: string;
}

export interface ParseResult {
  rows: (ParsedItemRow & { row: number })[];
  problems: RowProblem[];
  fileError: string | null; // set when the whole file can't be used
}

const norm = (s: string) => s.replace(/^﻿/, "").toLowerCase().replace(/[^a-z0-9]/g, "");

// ─── Parse an uploaded CSV into rows ready for addItem() ─────────────────────
export function parseInventoryCSV(text: string): ParseResult {
  const raw = parseCSVRaw(text).filter((r) => r.some((c) => c.trim() !== ""));
  if (raw.length === 0) return { rows: [], problems: [], fileError: "The file is empty." };

  const header = raw[0].map(norm);
  const col = {} as Record<keyof ParsedItemRow, number>;
  for (const c of COLUMNS) {
    const names = [c.header, c.key, ...c.aliases].map(norm);
    col[c.key] = header.findIndex((h) => names.includes(h));
  }

  const missing = (["name", "category", "unit", "stock"] as const).filter((k) => col[k] === -1);
  if (missing.length) {
    const labels = missing.map((k) => `"${COLUMNS.find((c) => c.key === k)!.header}"`);
    return {
      rows: [],
      problems: [],
      fileError: `This file is missing the column${missing.length > 1 ? "s" : ""} ${labels.join(", ")}. Download the template and use its first row as headers.`,
    };
  }

  const get = (r: string[], key: keyof ParsedItemRow) =>
    col[key] >= 0 ? (r[col[key]] || "").trim() : "";
  const num = (v: string) => Number(v.replace(/[₱,\s]/g, ""));

  const rows: ParseResult["rows"] = [];
  const problems: RowProblem[] = [];

  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    const rowNo = i + 1;
    const name = get(r, "name");
    if (!name || get(r, "description") === EXAMPLE_NOTE) continue;
    const bad = (message: string) => problems.push({ row: rowNo, name, message });

    const category = toCategory(get(r, "category"));
    if (!category) {
      bad(`Category "${get(r, "category")}" is not valid. Use one of: ${CATEGORY_HELP}.`);
      continue;
    }
    const unit = get(r, "unit");
    if (!unit) {
      bad("Counting unit is empty (e.g. sheet, pcs, roll).");
      continue;
    }
    const stock = num(get(r, "stock") || "0");
    if (Number.isNaN(stock) || stock < 0) {
      bad(`Stock "${get(r, "stock")}" must be a number 0 or higher.`);
      continue;
    }

    const returnableRaw = get(r, "returnable").toLowerCase();
    const returnable = returnableRaw
      ? ["yes", "y", "true", "1"].includes(returnableRaw)
      : category === "equipment";
    const locker = get(r, "locker");

    rows.push({
      row: rowNo,
      name,
      category,
      unit,
      stock: Math.round(stock),
      minStock: Math.max(0, Math.round(num(get(r, "minStock")) || 1)),
      maxStock: 0,
      returnable,
      packPrice: Math.max(0, num(get(r, "packPrice")) || 0),
      packSize: Math.max(1, Math.round(num(get(r, "packSize")) || 1)),
      qtyStep: Math.max(1, Math.round(num(get(r, "qtyStep")) || 1)),
      locker,
      location: locker || "Unassigned",
      supplier: get(r, "supplier"),
      description: get(r, "description"),
    });
  }

  return { rows, problems, fileError: null };
}
