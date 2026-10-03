import { useState } from "react";
import { Check } from "lucide-react";
import { useInventory } from "../context/InventoryContext";
import { CategoryKey, CATEGORIES } from "../types";
import ImageUpload from "../components/ImageUpload";

const inputCls =
  "w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";
const labelCls = "block text-sm font-medium text-foreground mb-1.5";
const hintCls = "text-xs text-muted-foreground -mt-0.5 mb-2";
const UNIT_SUGGESTIONS = ["pcs", "sheet", "roll", "set", "unit", "box"];

function Req() {
  return <span className="text-primary">*</span>;
}

function SectionTitle({
  n,
  title,
  optional,
}: {
  n: number;
  title: string;
  optional?: boolean;
}) {
  return (
    <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <span className="w-5 h-5 rounded-full bg-accent text-primary text-xs flex items-center justify-center">
        {n}
      </span>
      {title}
      {optional && (
        <span className="text-xs font-normal text-muted-foreground">
          (optional)
        </span>
      )}
    </h4>
  );
}

function ChoiceButton({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-3 rounded-lg border transition-colors ${
        active
          ? "border-primary bg-accent"
          : "border-border hover:bg-muted/50"
      }`}
    >
      <div
        className={`text-sm font-medium ${active ? "text-primary" : "text-foreground"}`}
      >
        {title}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
    </button>
  );
}

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
  const [submitting, setSubmitting] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());

  const hasPacks = (parseInt(packSize) || 1) > 1;
  const unitName = unit.trim() || "pieces";
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
    setRequestId(crypto.randomUUID());
  }

  const [saveError, setSaveError] = useState("");

  async function handleSave() {
    if (!name.trim() || !unit.trim() || submitting) return;
    setSaveError("");
    setSubmitting(true);
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
      clientRequestId: requestId,
    });
    if (!result.ok) {
      setSubmitting(false);
      setSaveError(result.message || "Could not save this item.");
      return;
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setSubmitting(false);
      reset();
      setPage("Inventory");
    }, 900);
  }

  const canSave =
    name.trim().length > 0 && unit.trim().length > 0 && !submitting;

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Item photo
          </h3>
          <ImageUpload value={image} onChange={setImage} />
          <p className="text-xs text-muted-foreground mt-2">
            Optional. Items without a photo show a colored badge with their
            initials instead.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Item details
          </h3>
          <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-5">
            <p className="text-xs text-muted-foreground">
              Fields marked <span className="text-primary font-semibold">*</span>{" "}
              are required. Everything else is optional.
            </p>

            {/* 1. What is it */}
            <section className="space-y-4">
              <SectionTitle n={1} title="What is it?" />
              <div>
                <label className={labelCls}>
                  Item name <Req />
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Bond Paper A4, Heat Press Machine"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Category <Req />
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const newCategory = e.target.value as CategoryKey;
                    setCategory(newCategory);
                    setReturnable(newCategory === "equipment");
                  }}
                  className={inputCls}
                >
                  {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => (
                    <option key={key} value={key}>
                      {CATEGORIES[key].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Will this item be returned?</label>
                <div className="grid grid-cols-2 gap-2">
                  <ChoiceButton
                    active={!returnable}
                    onClick={() => setReturnable(false)}
                    title="No, it gets used up"
                    desc="Materials like paper, ink, flyers"
                  />
                  <ChoiceButton
                    active={returnable}
                    onClick={() => setReturnable(true)}
                    title="Yes, it is borrowed"
                    desc="Equipment like cameras and tools. Tracked until returned."
                  />
                </div>
              </div>
            </section>

            {/* 2. How it is counted */}
            <section className="space-y-4 pt-4 border-t border-border">
              <SectionTitle n={2} title="How do you count it?" />
              <div>
                <label className={labelCls}>
                  Counting unit <Req />
                </label>
                <p className={hintCls}>
                  The single piece you count, not the pack. For bond paper, use
                  "sheet", not "ream".
                </p>
                <input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. sheet, pcs, roll"
                  className={inputCls}
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {UNIT_SUGGESTIONS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnit(u)}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                        unit.trim() === u
                          ? "bg-primary text-white border-primary"
                          : "border-border text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Pull out in groups of</label>
                <p className={hintCls}>
                  Staff can only take this item in multiples of this number.
                  Example: 10 means 10, 20, 30 {unitName}. Keep it at 1 to allow
                  any amount.
                </p>
                <input
                  type="number"
                  min={1}
                  value={qtyStep}
                  onChange={(e) => setQtyStep(e.target.value)}
                  className={inputCls}
                />
              </div>
            </section>

            {/* 3. Price */}
            <section className="space-y-3 pt-4 border-t border-border">
              <SectionTitle n={3} title="Price" optional />
              <p className={hintCls}>
                Used to compute costs in Reports. Example: one ream costs ₱300
                and has 500 sheets.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Price of one pack or box (₱)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={packPrice}
                    onChange={(e) => setPackPrice(e.target.value)}
                    placeholder="e.g. 300"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    How many {unitName} in one pack?
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={packSize}
                    onChange={(e) => setPackSize(e.target.value)}
                    placeholder="e.g. 500"
                    className={inputCls}
                  />
                </div>
              </div>
              {parseFloat(packPrice) > 0 && parseInt(packSize) > 0 && (
                <p className="text-xs text-muted-foreground">
                  That is{" "}
                  <span className="font-medium text-foreground">
                    ₱{(parseFloat(packPrice) / parseInt(packSize)).toFixed(2)}
                  </span>{" "}
                  per {unit.trim() || "piece"}.
                </p>
              )}
            </section>

            {/* 4. Stock */}
            <section className="space-y-4 pt-4 border-t border-border">
              <SectionTitle n={4} title="Stock" />
              <div>
                <label className={labelCls}>How many do you have right now?</label>
                {hasPacks && (
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setStockMode("pack")}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        stockMode === "pack"
                          ? "bg-foreground text-background border-foreground"
                          : "bg-card border-border text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      Count in packs
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
                      Count in {unitName}
                    </button>
                  </div>
                )}
                <input
                  type="number"
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className={inputCls}
                />
                {hasPacks && stockMode === "pack" && enteredStock > 0 && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    = {actualStockUnits} {unitName} total ({enteredStock} packs ×{" "}
                    {packSize} each)
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls}>Warn me when stock drops to</label>
                <p className={hintCls}>
                  The item shows as <span className="font-medium">Low Stock</span>{" "}
                  when it reaches this many {unitName} or less.
                </p>
                <input
                  type="number"
                  min={0}
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className={inputCls}
                />
              </div>
            </section>

            {/* 5. Storage and details */}
            <section className="space-y-4 pt-4 border-t border-border">
              <SectionTitle n={5} title="Storage and details" optional />
              <div
                className={`grid grid-cols-1 ${returnable ? "sm:grid-cols-2" : ""} gap-3`}
              >
                <div>
                  <label className={labelCls}>Where is it stored?</label>
                  <select
                    value={locker}
                    onChange={(e) => setLocker(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Not assigned</option>
                    <option value="Locker 1">Locker 1</option>
                    <option value="Locker 2">Locker 2</option>
                  </select>
                </div>
                {returnable && (
                  <div>
                    <label className={labelCls}>Current condition</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className={inputCls}
                    >
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Needs repair">Needs repair</option>
                      <option value="Damaged">Damaged</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className={labelCls}>Supplier</label>
                <input
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Where you buy it from"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this used for?"
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </section>

            {saveError && (
              <p className="text-xs text-destructive">{saveError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setPage("Inventory")}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  canSave
                    ? "bg-primary text-white hover:opacity-90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                {saved ? (
                  <>
                    <Check className="w-4 h-4" /> Added!
                  </>
                ) : submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />{" "}
                    Adding…
                  </>
                ) : (
                  "Add to inventory"
                )}
              </button>
            </div>
            {!canSave && !submitting && (
              <p className="text-xs text-muted-foreground text-center">
                Fill in <span className="font-medium">Item name</span> and{" "}
                <span className="font-medium">Counting unit</span> to add this
                item.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
