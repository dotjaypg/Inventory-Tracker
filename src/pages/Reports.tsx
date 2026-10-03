import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, Printer } from "lucide-react";
import { useInventory } from "../context/InventoryContext";
import { buildMonthlyUsage, usageToCSV } from "../lib/report";
import { downloadCSV, datedFilename } from "../lib/csv";

const peso = (n: number) =>
  `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ReportsPage() {
  const { logs, damageRecords } = useInventory();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const u = buildMonthlyUsage(logs, damageRecords, cursor.y, cursor.m);
  const isCurrentMonth = cursor.y === now.getFullYear() && cursor.m === now.getMonth();

  function shift(delta: number) {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-3xl">
      {/* Month picker + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => shift(-1)}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground print:hidden"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-base font-semibold text-foreground w-40 text-center">
            {u.label}
          </h2>
          <button
            onClick={() => shift(1)}
            disabled={isCurrentMonth}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:hover:bg-transparent print:hidden"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 sm:ml-auto print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 border border-border text-foreground px-3 py-2 rounded-lg text-sm hover:bg-muted/50 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print / PDF
          </button>
          <button
            onClick={() =>
              downloadCSV(
                datedFilename(`usage-${u.year}-${String(u.month + 1).padStart(2, "0")}`),
                usageToCSV(u),
              )
            }
            className="flex items-center gap-2 bg-primary text-white px-3 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" /> Download Excel
          </button>
        </div>
      </div>

      {/* Total */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <div className="text-sm text-muted-foreground">Total used in {u.label}</div>
        <div className="text-3xl font-bold text-foreground mt-1">{peso(u.totalCost)}</div>
        {u.repairsCost > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            Materials {peso(u.materialsCost)} + repairs {peso(u.repairsCost)}
          </div>
        )}
      </div>

      {/* Materials used */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Materials used</h3>
        </div>
        {u.materials.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No materials were pulled out in {u.label}.
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <th className="text-left px-5 py-2.5">Item</th>
                <th className="text-right px-5 py-2.5">Used</th>
                <th className="text-right px-5 py-2.5">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {u.materials.map((m) => (
                <tr key={`${m.item}|${m.unit}`}>
                  <td className="px-5 py-3 text-sm font-medium text-foreground">{m.item}</td>
                  <td className="px-5 py-3 text-sm text-right text-muted-foreground whitespace-nowrap">
                    {m.qty.toLocaleString()} {m.unit}
                  </td>
                  <td className="px-5 py-3 text-sm text-right whitespace-nowrap">
                    {m.cost > 0 ? (
                      <span className="font-semibold text-foreground">{peso(m.cost)}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No price set</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/30">
                <td className="px-5 py-3 text-sm font-semibold text-foreground" colSpan={2}>
                  Total
                </td>
                <td className="px-5 py-3 text-sm text-right font-bold text-foreground">
                  {peso(u.materialsCost)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {u.unpricedCount > 0 && (
        <p className="text-xs text-muted-foreground">
          "No price set" means the item has no pack price, so its cost can't be
          counted. Add one in <span className="font-medium">Inventory &gt; Edit item &gt; Price</span>.
          Only pull-outs made after that will show a cost.
        </p>
      )}

      {/* Repairs, only when there are any */}
      {u.repairs.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Repairs</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Equipment that came back damaged this month.
            </p>
          </div>
          <div className="divide-y divide-border">
            {u.repairs.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">{d.item}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {d.title} · {d.date}
                    {d.receiptUrl && (
                      <>
                        {" · "}
                        <a href={d.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Receipt
                        </a>
                      </>
                    )}
                  </div>
                </div>
                <span className="font-semibold text-foreground flex-shrink-0">{peso(d.cost)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
