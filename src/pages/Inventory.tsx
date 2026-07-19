import { useRef, useState } from "react";
import {
  Search,
  Filter,
  Upload,
  Download,
  Plus,
  X,
  Edit2,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useInventory } from "../context/InventoryContext";
import { InventoryItem, getStockStatus, CATEGORIES } from "../types";
import { itemsToCSV, downloadCSV, parseInventoryCSV } from "../lib/csv";
import StatusBadge from "../components/StatusBadge";
import ItemIcon from "../components/ItemIcon";
import CategoryChips, {
  CategoryFilterValue,
} from "../components/CategoryChips";
import EditItemModal from "../components/EditItemModal";

export default function Inventory({
  setPage,
}: {
  setPage: (p: string) => void;
}) {
  const { items, addItem, deleteItem } = useInventory();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilterValue>("all");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] =
    useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<{
    added: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = items.filter((i) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || i.category === category;
    const matchStatus =
      statusFilter === "All" || getStockStatus(i) === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  function toggleFilters() {
    setFiltersOpen((open) => {
      const next = !open;
      if (!next) setCategory("all"); // collapsing filters resets to "All" so a hidden filter can't stay active
      return next;
    });
  }

  function handleExport() {
    downloadCSV("inventory-export.csv", itemsToCSV(items));
  }

  function handleImportClick() {
    setImportResult(null);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setImportBusy(true);
    setImportResult(null);
    const text = await file.text();
    const { rows, errors } = parseInventoryCSV(text);

    let added = 0;
    for (const row of rows) {
      const result = await addItem({ ...row, image: null });
      if (result.ok) added++;
      else errors.push(`"${row.name}": ${result.message || "failed to add."}`);
    }

    setImportBusy(false);
    setImportResult({ added, errors });
  }

  const [deleteError, setDeleteError] = useState("");

  async function handleDelete() {
    if (!deleteConfirmItem || deleting) return;
    setDeleting(true);
    setDeleteError("");
    const result = await deleteItem(deleteConfirmItem.id);
    setDeleting(false);
    if (!result.ok) {
      setDeleteError(result.message || "Could not delete this item.");
      return;
    }
    if (selectedItem?.id === deleteConfirmItem.id) setSelectedItem(null);
    setDeleteConfirmItem(null);
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 p-4 md:p-6 min-w-0">
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative max-w-xs flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFilters}
              title={
                filtersOpen ? "Hide category filters" : "Show category filters"
              }
              className={`p-2 rounded-lg border transition-colors flex-shrink-0 ${
                filtersOpen
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>
            {filtersOpen ? (
              <CategoryChips value={category} onChange={setCategory} />
            ) : (
              <button
                onClick={() => setCategory("all")}
                className="px-3 py-1.5 rounded-full text-xs font-medium border bg-foreground text-background border-foreground transition-colors"
              >
                All
              </button>
            )}
          </div>
          <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="All">All Status</option>
              <option value="available">Available</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={handleImportClick}
              disabled={importBusy}
              className="flex items-center gap-2 bg-neutral-700 dark:bg-neutral-700 text-white border border-transparent px-3 py-2 rounded-lg text-sm hover:bg-neutral-600 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />{" "}
              <span className="hidden sm:inline">
                {importBusy ? "Importing…" : "Import"}
              </span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-neutral-700 dark:bg-neutral-700 text-white border border-transparent px-3 py-2 rounded-lg text-sm hover:bg-neutral-600 dark:hover:bg-neutral-600 transition-colors"
            >
              <Download className="w-4 h-4" />{" "}
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => setPage("Add Item")}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
        </div>

        {importResult && (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm flex items-start gap-2 ${
              importResult.errors.length
                ? "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950/40 dark:border-yellow-800 dark:text-yellow-300"
                : "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/40 dark:border-green-800 dark:text-green-300"
            }`}
          >
            {importResult.errors.length ? (
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className="font-medium">
                {importResult.added} item{importResult.added === 1 ? "" : "s"}{" "}
                imported successfully.
              </div>
              {importResult.errors.length > 0 && (
                <ul className="mt-1 space-y-0.5 list-disc list-inside">
                  {importResult.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
            <button
              onClick={() => setImportResult(null)}
              className="p-0.5 hover:opacity-70"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Mobile card list */}
        <div className="md:hidden space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="bg-card rounded-xl border border-border shadow-sm p-4 active:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <ItemIcon
                  name={item.name}
                  category={item.category}
                  image={item.image}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {item.name}
                    </span>
                    <StatusBadge status={getStockStatus(item)} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {CATEGORIES[item.category].label}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                    <span>
                      <span className="font-semibold text-foreground">
                        {item.stock}
                      </span>{" "}
                      {item.unit}
                    </span>
                    <span>{item.location}</span>
                    <span>{item.lastUpdated}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItem(item);
                  }}
                  className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingItem(item);
                  }}
                  className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmItem(item);
                  }}
                  className="p-2 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No items found matching your filters.
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {[
                  "Item",
                  "Category",
                  "Stock",
                  "Unit",
                  "Status",
                  "Location",
                  "Last Updated",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ItemIcon
                        name={item.name}
                        category={item.category}
                        image={item.image}
                      />
                      <span className="text-sm font-medium text-foreground">
                        {item.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {CATEGORIES[item.category].label}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-foreground">
                    {item.stock}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {item.unit}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={getStockStatus(item)} />
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {item.location}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {item.lastUpdated}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                        }}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingItem(item);
                        }}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmItem(item);
                        }}
                        className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No items found matching your filters.
            </div>
          )}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          {filtered.length} of {items.length} items
        </div>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-40 md:z-auto md:static md:inset-auto w-full md:w-80 border-l border-border bg-card flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Item Details</h3>
            <button
              onClick={() => setSelectedItem(null)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div>
              <h4 className="font-semibold text-foreground text-base leading-snug">
                {selectedItem.name}
              </h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                {CATEGORIES[selectedItem.category].label}
              </p>
              <div className="mt-1.5">
                <StatusBadge status={getStockStatus(selectedItem)} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {selectedItem.description}
            </p>
            <div className="space-y-2 text-sm">
              {[
                ["Current Stock", `${selectedItem.stock} ${selectedItem.unit}`],
                [
                  "Min. Stock",
                  `${selectedItem.minStock} ${selectedItem.unit} (alert threshold)`,
                ],
                ["Location", selectedItem.location],
                ["Locker", selectedItem.locker || "Unassigned"],
                ["Condition", selectedItem.condition || "—"],
                ["Supplier", selectedItem.supplier],
                ["Last Updated", selectedItem.lastUpdated],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between py-2 border-b border-border"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>

            {/* Item photo — replaces the old QR code placeholder */}
            <div className="bg-muted rounded-xl p-4 flex flex-col items-center gap-2">
              {selectedItem.image ? (
                <img
                  src={selectedItem.image}
                  alt={selectedItem.name}
                  className="w-full h-40 object-cover rounded-lg border border-border"
                />
              ) : (
                <div className="w-full h-40 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border">
                  <ItemIcon
                    name={selectedItem.name}
                    category={selectedItem.category}
                    image={null}
                    size="lg"
                  />
                  <span className="text-xs text-muted-foreground">
                    No photo uploaded
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="p-4 border-t border-border flex gap-2">
            <button
              onClick={() => setEditingItem(selectedItem)}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={() => setDeleteConfirmItem(selectedItem)}
              className="flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/60 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {deleteConfirmItem && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setDeleteConfirmItem(null)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Delete item?
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              This will permanently remove{" "}
              <span className="font-medium text-foreground">
                {deleteConfirmItem.name}
              </span>{" "}
              from your inventory. Past pull-out and restock history for this
              item will still be kept, but it will no longer be linked to a
              specific item. This can't be undone.
            </p>
            {deleteError && (
              <p className="text-xs text-destructive mb-4">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteConfirmItem(null);
                  setDeleteError("");
                }}
                className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
