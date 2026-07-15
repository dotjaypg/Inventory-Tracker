import { useState } from "react";
import { Search, Download, X, Printer, RotateCcw } from "lucide-react";
import { useInventory } from "../context/InventoryContext";
import { CATEGORIES } from "../types";
import StatusBadge from "../components/StatusBadge";
import Avatar from "../components/Avatar";

export default function HistoryPage() {
  const { logs, turnBackItem } = useInventory();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = logs.filter(
    (h) =>
      h.employee.toLowerCase().includes(search.toLowerCase()) ||
      h.item.toLowerCase().includes(search.toLowerCase()),
  );
  const selected = logs.find((l) => l.id === selectedId) || null;

  function exportCSV() {
    const rows = [
      [
        "ID",
        "Confirmed By",
        "Name / Dept.",
        "Item",
        "Category",
        "Qty",
        "Cost",
        "Purpose",
        "Borrow Date",
        "Status",
        "Returned At",
        "Approved By",
      ],
    ];
    logs.forEach((l) =>
      rows.push([
        l.id,
        l.confirmedBy || "",
        l.employee,
        l.item,
        CATEGORIES[l.category].label,
        String(l.qty),
        l.cost.toFixed(2),
        l.purpose,
        l.borrowDate,
        l.status,
        l.returnedAt || "",
        l.approvedBy || "",
      ]),
    );
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "history-log.csv";
    a.click();
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 min-w-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="relative max-w-xs flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search history..."
              className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-card border border-border text-foreground px-3 py-2 rounded-lg text-sm hover:bg-muted/50 ml-auto transition-colors"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {[
                  "Request ID",
                  "Employee",
                  "Item",
                  "Qty",
                  "Cost",
                  "Borrow Date",
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
              {filtered.map((h) => (
                <tr
                  key={h.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedId(h.id)}
                >
                  <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                    {h.id}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={h.employee} />
                      <span className="text-sm font-medium text-foreground">
                        {h.employee}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {h.item}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-foreground">
                    {h.qty}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {h.cost > 0 ? `₱${h.cost.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {h.borrowDate}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={h.status} />
                  </td>
                  <td className="px-4 py-3">
                    {h.status === "active" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          turnBackItem(h.id);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-green-50 hover:text-green-700 border border-border hover:border-green-200 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Turn Back
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No records found.
            </div>
          )}
        </div>
        {filtered.some((h) => h.cost > 0) && (
          <div className="mt-3 text-xs text-muted-foreground">
            Total value of filtered pull-outs:{" "}
            <span className="font-medium text-foreground">
              ₱{filtered.reduce((sum, h) => sum + h.cost, 0).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {selected && (
        <div className="w-72 border-l border-border bg-card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-foreground">
              Transaction Details
            </h3>
            <button
              onClick={() => setSelectedId(null)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">
                Transaction ID
              </div>
              <div className="font-mono font-medium text-foreground">
                {selected.id}
              </div>
            </div>
            {[
              ["Confirmed By", selected.confirmedBy || "—"],
              ["Name / Dept.", selected.employee],
              ["Item", selected.item],
              ["Quantity", String(selected.qty)],
              [
                "Cost",
                selected.cost > 0 ? `₱${selected.cost.toFixed(2)}` : "—",
              ],
              ["Purpose", selected.purpose],
              ["Borrow Date", selected.borrowDate],
              ["Returned At", selected.returnedAt || "—"],
              ["Approved By (return)", selected.approvedBy || "—"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between py-2 border-b border-border"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-foreground text-right max-w-[140px]">
                  {value}
                </span>
              </div>
            ))}
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={selected.status} />
            </div>
          </div>
          {selected.status === "active" && (
            <button
              onClick={() => turnBackItem(selected.id)}
              className="w-full mt-3 flex items-center justify-center gap-2 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <RotateCcw className="w-4 h-4" /> Turn Back
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-card border border-border text-foreground py-2 rounded-lg text-sm hover:bg-muted/50 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
        </div>
      )}
    </div>
  );
}
