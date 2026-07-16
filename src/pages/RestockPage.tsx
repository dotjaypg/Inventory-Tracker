import { useState } from "react";
import { PackagePlus, Search, Check } from "lucide-react";
import { useInventory } from "../context/InventoryContext";
import { useAuth } from "../context/AuthContext";
import { InventoryItem, CATEGORIES } from "../types";
import ItemIcon from "../components/ItemIcon";

export default function RestockPage() {
  const { items, restocks, restockItem } = useInventory();
  const { currentStaff } = useAuth();

  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [restockMode, setRestockMode] = useState<"pack" | "unit">("unit");
  const [qty, setQty] = useState("1");
  const [name, setName] = useState(currentStaff?.name || "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const browseItems = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );
  const hasPacks = (selectedItem?.packSize || 1) > 1;

  function selectItem(item: InventoryItem) {
    setSelectedItem(item);
    setRestockMode((item.packSize || 1) > 1 ? "pack" : "unit");
    setQty("1");
    setError("");
  }

  const enteredQty = parseInt(qty) || 0;
  const actualUnitsToAdd =
    restockMode === "pack" && selectedItem
      ? enteredQty * (selectedItem.packSize || 1)
      : enteredQty;

  async function handleRestock() {
    if (!selectedItem) return;
    if (!name.trim()) {
      setError("Please enter who is restocking this item.");
      return;
    }
    if (actualUnitsToAdd <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }
    setError("");
    const result = await restockItem({
      itemId: selectedItem.id,
      qty: actualUnitsToAdd,
      name: name.trim(),
    });
    if (!result.ok) {
      setError(result.message || "Could not restock this item.");
      return;
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setSelectedItem(null);
      setQty("1");
    }, 900);
  }

  return (
    <div className="p-4 md:p-6 flex flex-col md:flex-row gap-6 h-full">
      {/* Left: item picker */}
      <div className="flex-1 min-w-0">
        <div className="relative max-w-sm mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items to restock..."
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        {/* Mobile card list */}
        <div className="md:hidden space-y-2 mb-6">
          {browseItems.map((item) => (
            <div
              key={item.id}
              onClick={() => selectItem(item)}
              className={`bg-card rounded-xl border shadow-sm p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                selectedItem?.id === item.id
                  ? "bg-accent/40 border-primary"
                  : "border-border active:bg-muted/30"
              }`}
            >
              <ItemIcon
                name={item.name}
                category={item.category}
                image={item.image}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {item.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {CATEGORIES[item.category].label} · {item.stock} {item.unit}
                </div>
              </div>
              <span className="text-xs font-medium text-primary flex-shrink-0">
                Select →
              </span>
            </div>
          ))}
          {browseItems.length === 0 && (
            <div className="py-10 text-center text-muted-foreground text-sm">
              No items found.
            </div>
          )}
        </div>

        <div className="hidden md:block bg-card rounded-xl border border-border shadow-sm overflow-hidden mb-6">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {["Item", "Category", "Current Stock", "Unit", ""].map((h) => (
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
              {browseItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => selectItem(item)}
                  className={`cursor-pointer transition-colors ${
                    selectedItem?.id === item.id
                      ? "bg-accent/40"
                      : "hover:bg-muted/30"
                  }`}
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
                    {item.stock} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {item.unit}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-medium text-primary">
                      Select →
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {browseItems.length === 0 && (
            <div className="py-10 text-center text-muted-foreground text-sm">
              No items found.
            </div>
          )}
        </div>

        <h3 className="text-sm font-semibold text-foreground mb-3">
          Recent Restocks
        </h3>
        {/* Mobile card list */}
        <div className="md:hidden space-y-2">
          {restocks.slice(0, 10).map((r) => (
            <div
              key={r.id}
              className="bg-card rounded-xl border border-border shadow-sm p-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {r.item}
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.date} · {r.name}
                </div>
              </div>
              <span className="text-sm font-semibold text-foreground flex-shrink-0">
                +{r.qty}
              </span>
            </div>
          ))}
          {restocks.length === 0 && (
            <div className="py-10 text-center text-muted-foreground text-sm">
              No restocks logged yet.
            </div>
          )}
        </div>

        <div className="hidden md:block bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {["Date", "Item", "Quantity", "Restocked By"].map((h) => (
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
              {restocks.slice(0, 10).map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {r.date}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">
                    {r.item}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    +{r.qty}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {r.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {restocks.length === 0 && (
            <div className="py-10 text-center text-muted-foreground text-sm">
              No restocks logged yet.
            </div>
          )}
        </div>
      </div>

      {/* Right: restock form */}
      <div className="w-full md:w-80 flex-shrink-0">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Restock Item
        </h3>
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
          {selectedItem ? (
            <>
              <div className="flex items-center gap-3">
                <ItemIcon
                  name={selectedItem.name}
                  category={selectedItem.category}
                  image={selectedItem.image}
                  size="md"
                />
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {selectedItem.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Currently {selectedItem.stock} {selectedItem.unit}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Quantity to add{" "}
                  {hasPacks && (
                    <span className="text-muted-foreground font-normal">
                      (
                      {restockMode === "pack"
                        ? "in packs"
                        : `in ${selectedItem.unit}`}
                      )
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {hasPacks && (
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setRestockMode("pack")}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        restockMode === "pack"
                          ? "bg-foreground text-background border-foreground"
                          : "bg-card border-border text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      By pack (e.g. ream)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestockMode("unit")}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        restockMode === "unit"
                          ? "bg-foreground text-background border-foreground"
                          : "bg-card border-border text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      By {selectedItem.unit}
                    </button>
                  </div>
                )}
                {hasPacks && restockMode === "pack" && enteredQty > 0 && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    = {actualUnitsToAdd} {selectedItem.unit} added ({enteredQty}{" "}
                    × {selectedItem.packSize} per pack)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Restocked by
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <button
                onClick={handleRestock}
                className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 bg-primary text-white hover:opacity-90"
              >
                {saved ? (
                  <>
                    <Check className="w-4 h-4" /> Restocked!
                  </>
                ) : (
                  <>
                    <PackagePlus className="w-4 h-4" /> Confirm Restock
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="py-8 text-center">
              <PackagePlus className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Select an item from the list to restock it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
