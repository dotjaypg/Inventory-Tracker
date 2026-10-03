# InvenTrack Features

Inventory app for the Creative Department: track materials and equipment, who took what, and what it cost.

## Roles

| Role | Can use |
|---|---|
| **Admin** | Everything |
| **Staff** | Inventory, Requests, Restock |

Sign in by picking your name and typing a 4 to 6 digit PIN. Stays signed in on refresh; logs out when the tab closes or after 12 hours.

## Pages

**Dashboard** (admin)
- Greeting with a one-line status of what needs attention.
- Quick buttons: Add item, Pull out, Restock, Export report.
- Numbers: used this month (₱), pull-outs, borrowed now, need restocking.
- Lists: needs attention, borrowed right now, top materials this month, recent activity.

**Inventory**
- Search and filter items by category and stock status.
- Add, edit, delete items (an item can't be deleted while it's borrowed).
- **Import**: 3-step popup (download template, fill in, upload) with a preview. Skips duplicates and lists rows to fix.
- **Export** the full list to Excel.

**Add Item**
- Guided form: what it is, how it's counted, price, stock, storage.
- **Materials** get used up. **Equipment** is borrowed and returned.

**Requests**
- **Browse Inventory**: pull out materials or borrow equipment.
- **History Log**: every pull-out and borrow, with search, filters (All / Active / Returned), Turn Back for returns, total cost, and Export.
- Returning damaged equipment records a repair cost with a receipt.

**Restock**
- Items that need restocking are listed first.
- Popup: count in packs or units, quick +5 / +10 / +50, price paid (prefilled from the pack price), stock-after preview.
- Recent restocks shown beside the list.

**Employees** (admin)
- Explains what Admin and Staff can do.
- Per person: pull-outs logged, items not yet returned, last active, **View activity** popup.
- Make Admin / Change to Staff (the last admin can't be removed).

**Reports** (admin)
- Pick a month.
- **Used**: each material pulled out, how much, and its cost.
- **Bought**: each restock and what was paid.
- Repairs shown when there are any.
- Download Excel, or Print / Save PDF.

**Settings** (admin)
- **Staff & PINs**: add staff, reset PINs, delete staff.
- **Database**: connection status, storage bar, clear old history (blocked while items are still borrowed), monthly reminder.
- **Notifications**: turn alerts on or off, set how many days until a borrow is overdue.

## Everywhere

- **Notification bell**: low or out of stock, overdue borrows, new pull-outs (admins).
- Data refreshes every minute.
- Exported files are named `name-YYYY-MM-DD.csv`.
- Light and dark mode. Works on phones.
