import { useState } from "react";
import { PackagePlus, Search, Check, Minus, Plus, X } from "lucide-react";
import { useInventory } from "../context/InventoryContext";
import { useAuth } from "../context/AuthContext";
import { InventoryItem, CATEGORIES, getStockStatus } from "../types";
import ItemIcon from "../components/ItemIcon";
import StatusBadge from "../components/StatusBadge";

// Out of stock first, then low, then everything else (A to Z).
const STATUS_ORDER = { out: 0, low: 1, available: 2 } as const;

export default function RestockPage() {
  const { items, restocks, restockItem } = useInventory();
  const { currentStaff } = useAuth();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"needs" | "all">("all");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [countIn, setCountIn] = useState<"pack" | "unit">("unit");
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const needsCount = items.filter((i) => getStockStatus(i) !== "available").length;

  const list = items
    .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    .filter((i) => filter === "all" || getStockStatus(i) !== "available")
    .sort(
      (a, b) =>
        STATUS_ORDER[getStockStatus(a)] - STATUS_ORDER[getStockStatus(b)] ||
        a.name.localeCompare(b.name),
    );

  const packSize = selectedItem?.packSize || 1;
  const hasPacks = packSize > 1;
  const unitsToAdd = countIn === "pack" ? qty * packSize : qty;

  function open(item: InventoryItem) {
    setSelectedItem(item);
    setCountIn((item.packSize || 1) > 1 ? "pack" : "unit");
    setQty(1);
    setError("");
    setSaved(false);
  }

  function close() {
    if (submitting) return;
    setSelectedItem(null);
  }

  async function handleRestock() {
    if (!selectedItem || submitting) return;
    if (unitsToAdd <= 0) {
      setError("Enter how many to add.");
      return;
    }
    setError("");
    setSubmitting(true);
    const result = await restockItem({
      itemId: selectedItem.id,
      qty: unitsToAdd,
      // Recorded automatically as the person who is logged in.
      name: currentStaff?.name || "Unknown",
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message || "Could not restock this item.");
      return;
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setSelectedItem(null);
    }, 900);
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          {(
            [
              { key: "all", label: "All items" },
              { key: "needs", label: `Needs restock (${needsCount})` },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === f.key
                  ? "bg-primary text-white border-primary"
                  : "border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Item list: tap any row to restock it */}
      <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border overflow-hidden">
        {list.map((item) => (
          <button
            key={item.id}
            onClick={() => open(item)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
          >
            <ItemIcon name={item.name} category={item.category} image={item.image} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                {item.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {CATEGORIES[item.category].label} · {item.stock} {item.unit} left
              </div>
            </div>
            <div className="hidden sm:block">
              <StatusBadge status={getStockStatus(item)} />
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-white bg-primary px-3 py-1.5 rounded-lg flex-shrink-0">
              <PackagePlus className="w-3.5 h-3.5" /> Restock
            </span>
          </button>
        ))}
        {list.length === 0 && (
          <div className="py-10 text-center text-muted-foreground text-sm">
            {filter === "needs"
              ? "Nothing needs restocking right now."
              : "No items found."}
          </div>
        )}
      </div>

      {/* Recent restocks */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Recent restocks
        </h3>
        <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border overflow-hidden">
          {restocks.slice(0, 10).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {r.item}
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.date} · by {r.name}
                </div>
              </div>
              <span className="text-sm font-semibold text-green-600 dark:text-green-400 flex-shrink-0">
                +{r.qty}
              </span>
            </div>
          ))}
          {restocks.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No restocks yet.
            </div>
          )}
        </div>
      </div>

      {/* Restock popup */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
          onClick={close}
        >
          <div
            className="bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <ItemIcon
                name={selectedItem.name}
                category={selectedItem.category}
                image={selectedItem.image}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold text-foreground truncate">
                  {selectedItem.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  Now: {selectedItem.stock} {selectedItem.unit}
                </div>
              </div>
              <button
                onClick={close}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {hasPacks && (
              <div>
                <div className="text-sm font-medium text-foreground mb-1.5">
                  Count in
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { key: "pack", label: `Packs (${packSize} ${selectedItem.unit})` },
                      { key: "unit", label: `Single ${selectedItem.unit}` },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setCountIn(m.key)}
                      className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                        countIn === m.key
                          ? "border-primary bg-accent text-primary"
                          : "border-border text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium text-foreground mb-1.5">
                How many {countIn === "pack" ? "packs" : selectedItem.unit} to add?
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-11 h-11 rounded-lg border border-border flex items-center justify-center hover:bg-muted/50"
                  aria-label="Less"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  value={qty || ""}
                  onChange={(e) => setQty(Math.max(0, parseInt(e.target.value) || 0))}
                  className="flex-1 h-11 text-center text-lg font-semibold bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className="w-11 h-11 rounded-lg border border-border flex items-center justify-center hover:bg-muted/50"
                  aria-label="More"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                {[5, 10, 50].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQty((q) => q + n)}
                    className="flex-1 py-1.5 rounded-md text-xs font-medium border border-border text-muted-foreground hover:bg-muted/50"
                  >
                    +{n}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm flex items-center justify-between">
              <span className="text-muted-foreground">Stock after</span>
              <span className="font-semibold text-foreground">
                {selectedItem.stock} → {selectedItem.stock + unitsToAdd}{" "}
                {selectedItem.unit}
              </span>
            </div>

            <p className="text-xs text-muted-foreground -mt-2">
              Recorded as restocked by{" "}
              <span className="font-medium text-foreground">
                {currentStaff?.name}
              </span>
              .
            </p>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <button
              onClick={handleRestock}
              disabled={submitting || saved || unitsToAdd <= 0}
              className="w-full py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 bg-primary text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" /> Restocked!
                </>
              ) : submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />{" "}
                  Saving…
                </>
              ) : (
                <>
                  <PackagePlus className="w-4 h-4" /> Add {unitsToAdd}{" "}
                  {selectedItem.unit}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
