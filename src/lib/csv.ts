import { InventoryItem, CategoryKey } from "../types";

// ─── Shared CSV format used by both Inventory (Import/Export) and ─────────
// Settings → Database (template download + bulk upload). Keeping this in one
// place means both pages always agree on the same columns.

export const CSV_HEADERS = [
  "name",
  "category",
  "stock",
  "unit",
  "minStock",
  "maxStock",
  "location",
  "supplier",
  "description",
] as const;

const VALID_CATEGORIES: CategoryKey[] = ["marketing", "production", "merch", "equipment"];

function escapeCSVField(value: string | number): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ─── Export: current inventory as CSV (this doubles as a valid import file) ─
export function itemsToCSV(items: InventoryItem[]): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const it of items) {
    lines.push(
      [it.name, it.category, it.stock, it.unit, it.minStock, it.maxStock, it.location, it.supplier, it.description]
        .map(escapeCSVField)
        .join(",")
    );
  }
  return lines.join("\n");
}

// ─── Blank template with one example row — for admins to fill in and upload ─
export function csvTemplate(): string {
  const example = [
    "Bond Paper A4",
    "production",
    "20",
    "ream",
    "5",
    "30",
    "Storage B-2",
    "PaperOne PH",
    "Standard printing paper, A4 size.",
  ];
  return [CSV_HEADERS.join(","), example.map(escapeCSVField).join(",")].join("\n");
}

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Minimal CSV parser (handles quoted fields with commas/newlines) ───────
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
  location: string;
  supplier: string;
  description: string;
}

export interface ParseResult {
  rows: ParsedItemRow[];
  errors: string[];
}

// ─── Parse an uploaded CSV into rows ready for addItem() ───────────────────
export function parseInventoryCSV(text: string): ParseResult {
  const raw = parseCSVRaw(text).filter((r) => r.some((c) => c.trim() !== ""));
  if (raw.length === 0) return { rows: [], errors: ["The file is empty."] };

  const header = raw[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name.toLowerCase());
  const col = {
    name: idx("name"),
    category: idx("category"),
    stock: idx("stock"),
    unit: idx("unit"),
    minStock: idx("minstock"),
    maxStock: idx("maxstock"),
    location: idx("location"),
    supplier: idx("supplier"),
    description: idx("description"),
  };

  const errors: string[] = [];
  if (col.name === -1 || col.category === -1 || col.stock === -1 || col.unit === -1) {
    errors.push('CSV must include at least these columns: "name", "category", "stock", "unit".');
    return { rows: [], errors };
  }

  const rows: ParsedItemRow[] = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    const name = (r[col.name] || "").trim();
    if (!name) continue;

    const categoryRaw = (r[col.category] || "").trim().toLowerCase() as CategoryKey;
    if (!VALID_CATEGORIES.includes(categoryRaw)) {
      errors.push(
        `Row ${i + 1} ("${name}"): invalid category "${r[col.category]}" — must be one of marketing, production, merch, equipment. Skipped.`
      );
      continue;
    }

    rows.push({
      name,
      category: categoryRaw,
      stock: Number(r[col.stock]) || 0,
      unit: (r[col.unit] || "pcs").trim(),
      minStock: col.minStock >= 0 ? Number(r[col.minStock]) || 1 : 1,
      maxStock: col.maxStock >= 0 ? Number(r[col.maxStock]) || 10 : 10,
      location: col.location >= 0 ? (r[col.location] || "").trim() : "",
      supplier: col.supplier >= 0 ? (r[col.supplier] || "").trim() : "",
      description: col.description >= 0 ? (r[col.description] || "").trim() : "",
    });
  }

  return { rows, errors };
}