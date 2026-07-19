import { useState } from "react";
import { X } from "lucide-react";
import { useInventory } from "../context/InventoryContext";
import { LogEntry } from "../types";
import ReceiptUpload from "./ReceiptUpload";

const CONDITION_OPTIONS = ["Good", "Fair", "Needs repair", "Damaged"];
const DAMAGE_CONDITIONS = ["Needs repair", "Damaged"];

export default function ReturnItemModal({
  log,
  onClose,
}: {
  log: LogEntry;
  onClose: () => void;
}) {
  const { turnBackItem, addDamageRecord } = useInventory();

  const [condition, setCondition] = useState("Good");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const needsDamageRecord = DAMAGE_CONDITIONS.includes(condition);

  async function handleConfirm() {
    if (saving) return;
    setError("");

    if (needsDamageRecord) {
      if (!title.trim()) {
        setError("Please enter a title for the damage record.");
        return;
      }
      if (!cost || parseFloat(cost) <= 0) {
        setError("Please enter the repair/damage cost.");
        return;
      }
      if (!receiptUrl) {
        setError("A receipt attachment is required for damage records.");
        return;
      }
    }

    setSaving(true);
    const returnResult = await turnBackItem(log.id, condition);
    if (!returnResult.ok) {
      setSaving(false);
      setError(returnResult.message || "Could not process the return.");
      return;
    }

    if (needsDamageRecord) {
      const damageResult = await addDamageRecord({
        logId: log.id,
        itemId: log.itemId,
        title: title.trim(),
        description: description.trim(),
        cost: parseFloat(cost),
        date,
        receiptUrl: receiptUrl!,
      });
      setSaving(false);
      if (!damageResult.ok) {
        setError(
          `The item was returned, but the damage record could not be saved: ${damageResult.message || "unknown error"}. You can try logging it again from Reports.`,
        );
        return;
      }
    } else {
      setSaving(false);
    }

    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-foreground">Return Item</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm">
          <div className="font-medium text-foreground">{log.item}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {log.qty} {log.unit} · pulled out by {log.employee}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Condition (upon return)
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              {CONDITION_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {needsDamageRecord && (
            <div className="space-y-4 border-t border-border pt-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Damage Record
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Marking this item as {condition.toLowerCase()} — log the
                  actual repair/damage cost. This is what counts toward Value
                  Pulled Out, not the item's full value.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cracked lens hood"
                  className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="What happened, what needs fixing..."
                  className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Repair/Damage Cost (₱)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Receipt Attachment
                </label>
                <ReceiptUpload value={receiptUrl} onChange={setReceiptUrl} />
              </div>
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving…" : "Confirm Return"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
