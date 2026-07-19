import { useState } from "react";
import { X, Check } from "lucide-react";
import { useInventory } from "../context/InventoryContext";
import { InventoryItem, CategoryKey, CATEGORIES } from "../types";
import ImageUpload from "./ImageUpload";

export default function EditItemModal({
  item,
  onClose,
}: {
  item: InventoryItem;
  onClose: () => void;
}) {
  const { updateItem } = useInventory();

  const [image, setImage] = useState<string | null>(item.image);
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState<CategoryKey>(item.category);
  const [returnable, setReturnable] = useState(item.returnable);
  const [unit, setUnit] = useState(item.unit);
  const [packPrice, setPackPrice] = useState(
    item.packPrice ? String(item.packPrice) : "",
  );
  const [packSize, setPackSize] = useState(
    item.packSize && item.packSize > 1 ? String(item.packSize) : "",
  );
  const [qtyStep, setQtyStep] = useState(String(item.qtyStep || 1));
  const [stock, setStock] = useState(String(item.stock));
  const [minStock, setMinStock] = useState(String(item.minStock));
  const [locker, setLocker] = useState(item.locker || "");
  const [condition, setCondition] = useState(item.condition || "Good");
  const [supplier, setSupplier] = useState(item.supplier);
  const [description, setDescription] = useState(item.description);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSave = name.trim().length > 0 && unit.trim().length > 0;

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    setError("");
    const result = await updateItem(item.id, {
      name: name.trim(),
      category,
      unit: unit.trim(),
      stock: parseInt(stock) || 0,
      minStock: parseInt(minStock) || 1,
      maxStock: 0,
      location: locker || item.location,
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
    setSaving(false);
    if (!result.ok) {
      setError(result.message || "Could not save changes.");
      return;
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-foreground">Edit Item</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <ImageUpload value={image} onChange={setImage} />

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Item name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryKey)}
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
                  (smallest piece)
                </span>
              </label>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="pcs, sheet, unit..."
                className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Needs to be returned
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {returnable
                  ? "Borrow/return tracked (equipment)."
                  : "Pulled-out and consumed (materials). No due date, no return tracking."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReturnable((v) => !v)}
              className={`flex-shrink-0 w-10 h-5 rounded-full relative transition-colors ${returnable ? "bg-primary" : "bg-muted border border-border"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                  returnable ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

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
                className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Units per pack
              </label>
              <input
                type="number"
                min={1}
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
                placeholder="e.g. 500"
                className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>
          {parseFloat(packPrice) > 0 && parseInt(packSize) > 0 && (
            <p className="text-xs text-muted-foreground -mt-2">
              Cost per {unit.trim() || "unit"}:{" "}
              <span className="font-medium text-foreground">
                ₱{(parseFloat(packPrice) / parseInt(packSize)).toFixed(2)}
              </span>
            </p>
          )}

          <div>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Current stock{" "}
                <span className="text-muted-foreground font-normal">
                  (in {unit.trim() || "units"})
                </span>
              </label>
              <input
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Min. stock{" "}
                <span className="text-muted-foreground font-normal">
                  (in {unit.trim() || "units"})
                </span>
              </label>
              <input
                type="number"
                min={0}
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
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
              className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                "Saving…"
              ) : (
                <>
                  <Check className="w-4 h-4" /> Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
