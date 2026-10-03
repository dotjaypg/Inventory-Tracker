import { useEffect, useState } from "react";
import { Search, X, RotateCcw, Download } from "lucide-react";
import { downloadCSV, datedFilename } from "../lib/csv";
import { useInventory } from "../context/InventoryContext";
import { getStockStatus, CATEGORIES, unitCost, LogEntry } from "../types";
import StatusBadge from "../components/StatusBadge";
import ItemIcon from "../components/ItemIcon";
import Avatar from "../components/Avatar";
import ReturnItemModal from "../components/ReturnItemModal";

const CONDITION_OPTIONS = ["Good", "Fair", "Needs repair", "Damaged"];

export default function Requests() {
  const { items, logs, borrowItem, turnBackItem, refresh } = useInventory();
  const [activeTab, setActiveTab] = useState<"browse" | "log">("browse");
  const [reqTab, setReqTab] = useState("All");
  const [logSearch, setLogSearch] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedBorrowId, setSelectedBorrowId] = useState<number | null>(null);

  // Refresh on mount so a deleted/edited item elsewhere can't be silently
  // pulled out here on stale data.
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [formDept, setFormDept] = useState("");
  const [formQty, setFormQty] = useState("1");
  const [formPurpose, setFormPurpose] = useState("");
  const [formConditionOut, setFormConditionOut] = useState("Good");
  const [formError, setFormError] = useState("");
  const [requestId, setRequestId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [returnLog, setReturnLog] = useState<LogEntry | null>(null);

  const statusTabs = ["All", "Active", "Returned"];
  const q = logSearch.trim().toLowerCase();
  const filteredReqs = (
    reqTab === "All"
      ? logs
      : logs.filter((r) => r.status === reqTab.toLowerCase())
  ).filter(
    (r) =>
      !q ||
      [r.item, r.employee, r.confirmedBy || "", r.id, r.purpose]
        .join(" ")
        .toLowerCase()
        .includes(q),
  );
  const filteredCost = filteredReqs.reduce((sum, r) => sum + r.cost, 0);

  // Exports exactly what is shown (current filter + search).
  function exportLog() {
    const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["ID", "Confirmed By", "Name / Dept.", "Item", "Category", "Qty", "Unit", "Cost", "Purpose / Condition", "Date", "Status", "Returned At", "Approved By"];
    const rows = filteredReqs.map((l) => [
      l.id,
      l.confirmedBy || "",
      l.employee,
      l.item,
      CATEGORIES[l.category]?.label || l.category,
      l.qty,
      l.unit,
      l.cost.toFixed(2),
      l.needsReturn ? `Out: ${l.conditionOut || ""}${l.conditionIn ? ` / In: ${l.conditionIn}` : ""}` : l.purpose,
      l.borrowDate,
      l.needsReturn ? l.status : "used up",
      l.returnedAt || "",
      l.approvedBy || "",
    ]);
    downloadCSV(
      datedFilename("history-log"),
      [header, ...rows].map((r) => r.map(esc).join(",")).join("\n"),
    );
  }
  const browseItems = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );
  const selectedItem = items.find((i) => i.id === selectedBorrowId) || null;

  function openBorrow(itemId: number) {
    const item = items.find((i) => i.id === itemId);
    setSelectedBorrowId(itemId);
    setFormDept("");
    setFormQty(String(item?.qtyStep || 1));
    setFormPurpose("");
    setFormConditionOut("Good");
    setFormError("");
    setRequestId(crypto.randomUUID());
    setSubmitting(false);
    setShowModal(true);
  }

  const needsReturn = selectedItem?.returnable ?? false;

  async function handleBorrow() {
    if (!selectedItem || submitting) return;
    if (!formDept.trim()) {
      setFormError("Please enter the name / department.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    const step = selectedItem.qtyStep || 1;
    const rawQty = parseInt(formQty) || step;
    const qty = Math.max(step, Math.round(rawQty / step) * step);
    const result = await borrowItem({
      itemId: selectedItem.id,
      employee: formDept.trim(),
      dept: formDept.trim(),
      qty,
      purpose: needsReturn ? "" : formPurpose.trim() || "Not specified",
      conditionOut: needsReturn ? formConditionOut : null,
      clientRequestId: requestId,
    });
    if (!result.ok) {
      setSubmitting(false);
      setFormError(result.message || "Could not complete this request.");
      return;
    }
    setShowModal(false);
    setSubmitting(false);
  }

  function openReturn(log: LogEntry) {
    if (log.needsReturn) {
      setReturnLog(log);
    } else {
      turnBackItem(log.id);
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex gap-3 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab("browse")}
          className={`pb-3 px-1 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "browse"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Browse Inventory
        </button>
        <button
          onClick={() => setActiveTab("log")}
          className={`pb-3 px-1 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "log"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          History Log
          {/* Counts only returnable items (equipment) still out. Material
              pull-outs are consumed, so they are logged as finished and do
              not add to this number. */}
          <span
            title="Items borrowed and not yet returned"
            aria-label="Items borrowed and not yet returned"
            className="ml-2 bg-primary text-white text-xs px-1.5 py-0.5 rounded-full cursor-help"
          >
            {logs.filter((r) => r.status === "active").length}
          </span>
        </button>
      </div>

      {activeTab === "browse" ? (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="relative max-w-xs flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search available items..."
                className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {browseItems.map((item) => {
              const status = getStockStatus(item);
              return (
                <div
                  key={item.id}
                  className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden"
                >
                  <div className="h-28 bg-gradient-to-br from-muted to-secondary flex items-center justify-center">
                    <ItemIcon
                      name={item.name}
                      category={item.category}
                      image={item.image}
                      size="lg"
                    />
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-foreground text-sm leading-snug mb-1">
                      {item.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      {CATEGORIES[item.category].label}
                    </p>
                    <div className="flex items-center justify-between mb-3">
                      <StatusBadge status={status} />
                      <span className="text-xs text-muted-foreground">
                        Qty: {item.stock}
                      </span>
                    </div>
                    <button
                      disabled={status === "out"}
                      onClick={() => openBorrow(item.id)}
                      className={`w-full py-2 rounded-lg text-xs font-medium transition-colors ${
                        status === "out"
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : "bg-primary text-white hover:opacity-90"
                      }`}
                    >
                      {status === "out" ? "Unavailable" : "Borrow"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
            <div className="relative max-w-xs flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search item, name, or ID..."
                className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div className="flex gap-2 items-center">
            {statusTabs.map((t) => (
              <button
                key={t}
                onClick={() => setReqTab(t)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  reqTab === t
                    ? "bg-primary text-white"
                    : "bg-card border border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {t}
              </button>
            ))}
            </div>
            <button
              onClick={exportLog}
              title="Download what is shown below (opens in Excel)"
              className="sm:ml-auto flex items-center justify-center gap-2 bg-neutral-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-neutral-600 transition-colors"
            >
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
          {/* Mobile card list */}
          <div className="md:hidden space-y-2">
            {filteredReqs.map((r) => (
              <div
                key={r.id}
                className="bg-card rounded-xl border border-border shadow-sm p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {r.item}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.employee} · Qty {r.qty}
                    </div>
                  </div>
                  {r.needsReturn ? (
                    r.status === "returned" ? (
                      <StatusBadge status="returned" />
                    ) : (
                      <StatusBadge status="active" />
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      —
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{r.borrowDate}</span>
                  <span>{r.cost > 0 ? `₱${r.cost.toFixed(2)}` : "—"}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {r.needsReturn
                    ? `Out: ${r.conditionOut || "—"}${r.conditionIn ? ` · In: ${r.conditionIn}` : ""}`
                    : r.purpose}
                </div>
                {r.needsReturn && r.status === "active" && (
                  <button
                    onClick={() => openReturn(r)}
                    className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-green-50 hover:text-green-700 border border-border hover:border-green-200 dark:hover:bg-green-950/40 dark:hover:text-green-300 dark:hover:border-green-800 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Turn Back
                  </button>
                )}
              </div>
            ))}
            {filteredReqs.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No records found.
              </div>
            )}
          </div>

          <div className="hidden md:block bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {[
                    "Confirmed By",
                    "Name / Dept.",
                    "Item",
                    "Qty",
                    "Purpose",
                    "Cost",
                    "Date Borrowed",
                    "Status",
                    "",
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
                {filteredReqs.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={r.confirmedBy || "?"} />
                        <div className="text-sm font-medium text-foreground">
                          {r.confirmedBy || "—"}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {r.employee}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {r.item}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-foreground">
                      {r.qty}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[160px] truncate">
                      {r.needsReturn
                        ? `Out: ${r.conditionOut || "—"}${r.conditionIn ? ` · In: ${r.conditionIn}` : ""}`
                        : r.purpose}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {r.cost > 0 ? `₱${r.cost.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {r.borrowDate}
                    </td>
                    <td className="px-4 py-3">
                      {r.needsReturn ? (
                        r.status === "returned" ? (
                          <div>
                            <StatusBadge status="returned" />
                            {r.returnedAt && (
                              <div className="text-[11px] text-muted-foreground mt-1">
                                on {r.returnedAt}
                              </div>
                            )}
                          </div>
                        ) : (
                          <StatusBadge status="active" />
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.needsReturn && r.status === "active" && (
                        <button
                          onClick={() => openReturn(r)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-green-50 hover:text-green-700 border border-border hover:border-green-200 dark:hover:bg-green-950/40 dark:hover:text-green-300 dark:hover:border-green-800 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Turn Back
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredReqs.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No records found.
              </div>
            )}
          </div>
          <div className="mt-3 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
            <span>
              Showing {filteredReqs.length} of {logs.length} records
            </span>
            {filteredCost > 0 && (
              <span>
                Total cost shown:{" "}
                <span className="font-medium text-foreground">
                  ₱{filteredCost.toFixed(2)}
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {showModal && selectedItem && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => !submitting && setShowModal(false)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground">
                {needsReturn ? "Pull-Out (Needs Return)" : "Pull-Out Material"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg mb-5">
              <ItemIcon
                name={selectedItem.name}
                category={selectedItem.category}
                image={selectedItem.image}
                size="md"
              />
              <div>
                <div className="font-medium text-foreground text-sm">
                  {selectedItem.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedItem.stock} available · {selectedItem.location}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Name / Dept.
                </label>
                <input
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  placeholder="e.g. Jordan Ronsairo / Marketing"
                  className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Quantity{" "}
                  {selectedItem.qtyStep > 1 && (
                    <span className="text-muted-foreground font-normal">
                      (steps of {selectedItem.qtyStep})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min={selectedItem.qtyStep}
                  max={selectedItem.stock}
                  step={selectedItem.qtyStep}
                  value={formQty}
                  onChange={(e) => setFormQty(e.target.value)}
                  className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {unitCost(selectedItem) > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Estimated cost:{" "}
                    <span className="font-medium text-foreground">
                      ₱
                      {(
                        unitCost(selectedItem) * (parseInt(formQty) || 0)
                      ).toFixed(2)}
                    </span>
                  </p>
                )}
              </div>
              {needsReturn ? (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Condition (at pull-out)
                  </label>
                  <select
                    value={formConditionOut}
                    onChange={(e) => setFormConditionOut(e.target.value)}
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    {CONDITION_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Purpose / Project
                  </label>
                  <input
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value)}
                    placeholder="What will this be used for?"
                    className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              )}
              {formError && (
                <p className="text-xs text-destructive">{formError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBorrow}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting && (
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                  {submitting ? "Submitting…" : "Confirm Pull-Out"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {returnLog && (
        <ReturnItemModal log={returnLog} onClose={() => setReturnLog(null)} />
      )}
    </div>
  );
}
