import { InventoryItem, Employee, LogEntry, RestockEntry } from "../types";

export const seedItems: InventoryItem[] = [
  // Production Equipment
  { id: 1, name: "Heat Press Machine", category: "equipment", stock: 2, unit: "unit", location: "Storage A-1", locker: "Locker 1", condition: "Good", lastUpdated: "2024-06-10", image: null, minStock: 1, maxStock: 4, supplier: "PrintTech Supply", description: "Used for transferring designs onto shirts and merch.", packPrice: 0, packSize: 1, qtyStep: 1, returnable: true },
  { id: 2, name: "Laminator", category: "equipment", stock: 1, unit: "unit", location: "Storage A-1", locker: "Locker 1", condition: "Good", lastUpdated: "2024-06-08", image: null, minStock: 1, maxStock: 2, supplier: "PrintTech Supply", description: "A3 roll laminator for finishing printed materials.", packPrice: 0, packSize: 1, qtyStep: 1, returnable: true },
  { id: 3, name: "Cutter Machine", category: "equipment", stock: 1, unit: "unit", location: "Storage A-2", locker: "Locker 1", condition: "Good", lastUpdated: "2024-06-07", image: null, minStock: 1, maxStock: 2, supplier: "Vinyl Worx", description: "Vinyl and sticker cutting machine.", packPrice: 0, packSize: 1, qtyStep: 1, returnable: true },
  { id: 4, name: "Sony A7 IV Camera", category: "equipment", stock: 2, unit: "pcs", location: "Storage A-2", locker: "Locker 1", condition: "Good", lastUpdated: "2024-06-10", image: null, minStock: 1, maxStock: 4, supplier: "Sony Philippines", description: "Used for product and event photography.", packPrice: 0, packSize: 1, qtyStep: 1, returnable: true },
  { id: 5, name: "Scissors", category: "equipment", stock: 5, unit: "pcs", location: "Storage B-1", locker: "Locker 2", condition: "Good", lastUpdated: "2024-06-05", image: null, minStock: 2, maxStock: 10, supplier: "Office Depot", description: "General purpose cutting tool.", packPrice: 0, packSize: 1, qtyStep: 1, returnable: true },
  { id: 6, name: "Stapler", category: "equipment", stock: 0, unit: "pcs", location: "Storage B-1", locker: "Locker 2", condition: "Needs repair", lastUpdated: "2024-06-02", image: null, minStock: 1, maxStock: 4, supplier: "Office Depot", description: "Heavy duty stapler.", packPrice: 0, packSize: 1, qtyStep: 1, returnable: true },

  // Production Materials
  { id: 7, name: "Bond Paper A4", category: "production", stock: 9000, unit: "pcs", location: "Storage B-2", locker: "Locker 2", condition: "Good", lastUpdated: "2024-06-10", image: null, minStock: 2500, maxStock: 15000, supplier: "PaperOne PH", description: "Standard printing paper, A4 size. Tracked per sheet — 500 sheets per ream.", packPrice: 300, packSize: 500, qtyStep: 10, returnable: false },
  { id: 8, name: "Vinyl Sticker Roll", category: "production", stock: 3, unit: "roll", location: "Storage B-2", locker: "Locker 2", condition: "Good", lastUpdated: "2024-06-09", image: null, minStock: 2, maxStock: 10, supplier: "Vinyl Worx", description: "Glossy vinyl roll for sticker printing.", packPrice: 0, packSize: 1, qtyStep: 1, returnable: false },
  { id: 9, name: "Ink Cartridge (CMYK Set)", category: "production", stock: 1, unit: "set", location: "Storage B-2", locker: "Locker 2", condition: "Good", lastUpdated: "2024-06-06", image: null, minStock: 2, maxStock: 6, supplier: "PrintTech Supply", description: "Full color set for the production printer.", packPrice: 0, packSize: 1, qtyStep: 1, returnable: false },
  { id: 10, name: "Lamination Film", category: "production", stock: 4, unit: "roll", location: "Storage B-2", locker: "Locker 2", condition: "Good", lastUpdated: "2024-06-04", image: null, minStock: 2, maxStock: 8, supplier: "PrintTech Supply", description: "Matte lamination film, 250m roll.", packPrice: 0, packSize: 1, qtyStep: 1, returnable: false },

  // Marketing Materials
  { id: 11, name: "Tarpaulin Banner (3x5ft)", category: "marketing", stock: 6, unit: "pcs", location: "Storage C-1", locker: "Locker 1", condition: "Good", lastUpdated: "2024-06-09", image: null, minStock: 2, maxStock: 12, supplier: "Vinyl Worx", description: "Pre-printed promotional tarpaulin banners.", packPrice: 0, packSize: 1, qtyStep: 1, returnable: false },
  { id: 12, name: "Flyers (A5)", category: "marketing", stock: 200, unit: "pcs", location: "Storage C-1", locker: "Locker 1", condition: "Good", lastUpdated: "2024-06-08", image: null, minStock: 50, maxStock: 500, supplier: "PrintTech Supply", description: "Promotional flyers for events and campaigns.", packPrice: 0, packSize: 1, qtyStep: 1, returnable: false },
  { id: 13, name: "Business Cards", category: "marketing", stock: 80, unit: "pcs", location: "Storage C-1", locker: "Locker 1", condition: "Good", lastUpdated: "2024-06-07", image: null, minStock: 50, maxStock: 300, supplier: "PrintTech Supply", description: "Standard 3.5x2in business cards.", packPrice: 0, packSize: 1, qtyStep: 1, returnable: false },

  // Merch
  { id: 14, name: "Tote Bags", category: "merch", stock: 45, unit: "pcs", location: "Storage D-1", locker: "Locker 2", condition: "Good", lastUpdated: "2024-06-10", image: null, minStock: 10, maxStock: 100, supplier: "Merch Manila", description: "Canvas tote bags, blank for printing.", packPrice: 0, packSize: 1, qtyStep: 1, returnable: false },
  { id: 15, name: "Printed Shirts (S–XL)", category: "merch", stock: 20, unit: "pcs", location: "Storage D-1", locker: "Locker 2", condition: "Good", lastUpdated: "2024-06-09", image: null, minStock: 5, maxStock: 60, supplier: "Merch Manila", description: "Pre-printed company shirts, assorted sizes.", packPrice: 0, packSize: 1, qtyStep: 1, returnable: false },
  { id: 16, name: "Caps", category: "merch", stock: 15, unit: "pcs", location: "Storage D-1", locker: "Locker 2", condition: "Good", lastUpdated: "2024-06-05", image: null, minStock: 5, maxStock: 40, supplier: "Merch Manila", description: "Embroidered company caps.", packPrice: 0, packSize: 1, qtyStep: 1, returnable: false },
];

export const seedEmployees: Employee[] = [
  { id: 1, name: "Jordan Ronsairo", dept: "Creative Direction", role: "Intern", email: "jordan.ronsairo@creative.ph" },
  { id: 2, name: "Macky Macahilas", dept: "Photography", role: "Intern", email: "macky.macahilas@creative.ph" },
  { id: 3, name: "Renee Morales", dept: "Video Production", role: "Intern", email: "renee.morales@creative.ph" },
  { id: 4, name: "Luis Padrinao", dept: "Graphic Design", role: "Intern", email: "luis.padrinao@creative.ph" },
  { id: 5, name: "MJ Pagayunan", dept: "Marketing", role: "Intern", email: "mj.pagayunan@creative.ph" },
  { id: 6, name: "JC Rodriguez", dept: "Photography", role: "Intern", email: "jc.rodriguez@creative.ph" },
  { id: 7, name: "Carlo Torres", dept: "Video Production", role: "Intern", email: "carlo.torres@creative.ph" },
  { id: 8, name: "David Espiritu", dept: "Creative Direction", role: "Intern", email: "david.espiritu@creative.ph" },
];

export const seedLogs: LogEntry[] = [
  { id: "REQ-0041", itemId: 4, item: "Sony A7 IV Camera", category: "equipment", qty: 1, unit: "pcs", employee: "Jordan Ronsairo", dept: "Photography", purpose: "Product shoot for Q3 campaign", borrowDate: "2024-06-10", status: "active", returnedAt: null, approvedBy: null, confirmedBy: null, needsReturn: true, conditionOut: "Good", conditionIn: null, cost: 0 },
  { id: "REQ-0040", itemId: 11, item: "Tarpaulin Banner (3x5ft)", category: "marketing", qty: 2, unit: "pcs", employee: "Macky Macahilas", dept: "Marketing", purpose: "Pop-up booth setup", borrowDate: "2024-06-09", status: "active", returnedAt: null, approvedBy: null, confirmedBy: null, needsReturn: false, conditionOut: null, conditionIn: null, cost: 0 },
  { id: "REQ-0039", itemId: 1, item: "Heat Press Machine", category: "equipment", qty: 1, unit: "unit", employee: "JC Rodriguez", dept: "Merch Production", purpose: "Shirt printing run", borrowDate: "2024-06-08", status: "active", returnedAt: null, approvedBy: null, confirmedBy: null, needsReturn: true, conditionOut: "Good", conditionIn: null, cost: 0 },
  { id: "REQ-0038", itemId: 14, item: "Tote Bags", category: "merch", qty: 10, unit: "pcs", employee: "Renee Morales", dept: "Marketing", purpose: "Conference giveaways", borrowDate: "2024-06-05", status: "returned", returnedAt: "2024-06-11", approvedBy: "Andrea Santos", confirmedBy: null, needsReturn: false, conditionOut: null, conditionIn: null, cost: 0 },
  { id: "REQ-0037", itemId: 2, item: "Laminator", category: "equipment", qty: 1, unit: "unit", employee: "Carlo Torres", dept: "Graphic Design", purpose: "Menu lamination job", borrowDate: "2024-06-04", status: "returned", returnedAt: "2024-06-09", approvedBy: "Andrea Santos", confirmedBy: null, needsReturn: true, conditionOut: "Good", conditionIn: "Good", cost: 0 },
  { id: "REQ-0036", itemId: 3, item: "Cutter Machine", category: "equipment", qty: 1, unit: "unit", employee: "David Espiritu", dept: "Video Production", purpose: "Sticker pack production", borrowDate: "2024-06-03", status: "returned", returnedAt: "2024-06-08", approvedBy: "Andrea Santos", confirmedBy: null, needsReturn: true, conditionOut: "Good", conditionIn: "Minor scratches", cost: 0 },
  { id: "REQ-0035", itemId: 13, item: "Business Cards", category: "marketing", qty: 25, unit: "pcs", employee: "MJ Pagayunan", dept: "Marketing", purpose: "Client meeting handouts", borrowDate: "2024-05-28", status: "returned", returnedAt: "2024-06-01", approvedBy: "Andrea Santos", confirmedBy: null, needsReturn: false, conditionOut: null, conditionIn: null, cost: 0 },
];

export const seedRestocks: RestockEntry[] = [
  { id: 1, itemId: 7, item: "Bond Paper A4", qty: 10, name: "Andrea Santos", date: "2024-06-01", cost: 6000 },
  { id: 2, itemId: 9, item: "Ink Cartridge (CMYK Set)", qty: 2, name: "Andrea Santos", date: "2024-05-20", cost: 0 },
];