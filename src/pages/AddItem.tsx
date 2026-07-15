import { useState } from "react";
import { Check } from "lucide-react";
import { useInventory } from "../context/InventoryContext";
import { CategoryKey, CATEGORIES } from "../types";
import ImageUpload from "../components/ImageUpload";

export default function AddItem({ setPage }: { setPage: (p: string) => void }) {
  const { addItem } = useInventory();
  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<CategoryKey>("production");
  const [returnable, setReturnable] = useState(false);
  const [unit, setUnit] = useState("");
  const [packPrice, setPackPrice] = useState("");
  const [packSize, setPackSize] = useState("");
  const [qtyStep, setQtyStep] = useState("1");
  const [stockMode, setStockMode] = useState<"pack" | "unit">("unit");
  const [stock, setStock] = useState("1");
  const [minStock, setMinStock] = useState("1");
  const [locker, setLocker] = useState("");
  const [condition, setCondition] = useState("Good");
  const [supplier, setSupplier] = useState("");
  const [description, setDescription] = useState("");
  const [saved, setSaved] = useState(false);

  const hasPacks = (parseInt(packSize) || 1) > 1;
  const enteredStock = parseInt(stock) || 0;
  const actualStockUnits =
    stockMode === "pack" && hasPacks
      ? enteredStock * (parseInt(packSize) || 1)
      : enteredStock;

  function reset() {
    setImage(null);
    setName("");
    setCategory("production");
    setReturnable(false);
    setUnit("");
    setPackPrice("");
    setPackSize("");
    setQtyStep("1");
    setStockMode("unit");
    setStock("1");
    setMinStock("1");
    setLocker("");
    setCondition("Good");
    setSupplier("");
    setDescription("");
  }

  const [saveError, setSaveError] = useState("");

  async function handleSave() {
    if (!name.trim() || !unit.trim()) return;
    setSaveError("");
    const result = await addItem({
      name: name.trim(),
      category,
      unit: unit.trim(),
      stock: actualStockUnits,
      minStock: parseInt(minStock) || 1,
      maxStock: 0, // no fixed ceiling — max stock depends on the item's real-world need, not a set number
      location: locker || "Unassigned",
      locker: locker || undefined,
      condition: condition || undefined,
      packPrice: parseFloat(packPrice) || 0,
      packSize: parseInt(packSize) || 1,
      qtyStep: parseInt(qtyStep) || 1,
      returnable,
      supplier: supplier.trim(),
      description: description.trim(),
      image,
    });
    if (!result.ok) {
      setSaveError(result.message || "Could not save this item.");
      return;
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      reset();
      setPage("Inventory");
    }, 900);
  }

  const canSave = name.trim().length > 0 && unit.trim().length > 0;

  return (
    <div className="p-6 max-w-4xl">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Item photo
          </h3>
          <ImageUpload value={image} onChange={setImage} />
          <p className="text-xs text-muted-foreground mt-2">
            Optional — items without a photo show a colored initial badge
            instead.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Item details
          </h3>
          <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Item name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Heat Press Machine"
                className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const newCategory = e.target.value as CategoryKey;
                  setCategory(newCategory);
                  setReturnable(newCategory === "equipment");
                }}
                className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => (
                  <option key={key} value={key}>
                    {CATEGORIES[key].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Unit{" "}
                <span className="text-muted-foreground font-normal">
                  — the smallest piece you count, e.g. "pcs" or "sheet". NOT the
                  pack/ream/box — that goes below.
                </span>
              </label>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="pcs, ream, unit..."
                className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Needs to be returned
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {returnable
                      ? "This item is borrowed and returned (equipment). Pull-outs track condition and status until returned."
                      : "This item is pulled out and consumed (materials). No return tracking, no due date."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReturnable((v) => !v)}
                  className={`flex-shrink-0 w-11 h-6 rounded-full relative transition-colors ${returnable ? "bg-primary" : "bg-muted border border-border"}`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      returnable ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Pricing &amp; Pull-Out Bundling{" "}
                <span className="normal-case font-normal">(optional)</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Pack price (₱)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={packPrice}
                    onChange={(e) => setPackPrice(e.target.value)}
                    placeholder="e.g. 300"
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Units per pack{" "}
                    <span className="text-muted-foreground font-normal">
                      (in {unit.trim() || "your Unit above"})
                    </span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={packSize}
                    onChange={(e) => setPackSize(e.target.value)}
                    placeholder="e.g. 500 sheets/ream"
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>
              {parseFloat(packPrice) > 0 && parseInt(packSize) > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Cost per {unit.trim() || "unit"}:{" "}
                  <span className="font-medium text-foreground">
                    ₱{(parseFloat(packPrice) / parseInt(packSize)).toFixed(2)}
                  </span>
                </p>
              )}
              <div className="mt-3">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Pull-out quantity step
                </label>
                <input
                  type="number"
                  min={1}
                  value={qtyStep}
                  onChange={(e) => setQtyStep(e.target.value)}
                  className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Quantity jumps by this amount when pulling out this item (e.g.
                  10 for bond paper). Leave at 1 for one-by-one items.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Initial stock{" "}
                {hasPacks && (
                  <span className="text-muted-foreground font-normal">
                    (
                    {stockMode === "pack"
                      ? "in packs"
                      : `in ${unit.trim() || "units"}`}
                    )
                  </span>
                )}
              </label>
              <input
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              {hasPacks && (
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setStockMode("pack")}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      stockMode === "pack"
                        ? "bg-foreground text-background border-foreground"
                        : "bg-card border-border text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    By pack (e.g. ream)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockMode("unit")}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      stockMode === "unit"
                        ? "bg-foreground text-background border-foreground"
                        : "bg-card border-border text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    By {unit.trim() || "unit"}
                  </button>
                </div>
              )}
              {hasPacks && stockMode === "pack" && enteredStock > 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  = {actualStockUnits} {unit.trim() || "units"} total (
                  {enteredStock} × {packSize} per pack)
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Minimum stock (low-stock alert threshold)
              </label>
              <input
                type="number"
                min={0}
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Locker
                </label>
                <select
                  value={locker}
                  onChange={(e) => setLocker(e.target.value)}
                  className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="">Unassigned</option>
                  <option value="Locker 1">Locker 1</option>
                  <option value="Locker 2">Locker 2</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Needs repair">Needs repair</option>
                  <option value="Damaged">Damaged</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Supplier
              </label>
              <input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Supplier name"
                className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Notes (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this used for?"
                rows={2}
                className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              />
            </div>

            {saveError && (
              <p className="text-xs text-destructive">{saveError}</p>
            )}

            <button
              onClick={handleSave}
              disabled={!canSave}
              className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                canSave
                  ? "bg-primary text-white hover:opacity-90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" /> Added!
                </>
              ) : (
                "Add to inventory"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
