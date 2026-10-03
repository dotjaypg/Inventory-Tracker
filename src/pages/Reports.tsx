import { useState } from "react";
import { Printer, Download, Info } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useInventory } from "../context/InventoryContext";
import { CategoryKey } from "../types";
import {
  buildReport,
  reportToCSV,
  ReportPeriod,
  PERIOD_LABELS,
} from "../lib/report";
import { downloadCSV, datedFilename } from "../lib/csv";

const CHART_COLORS: Record<CategoryKey, string> = {
  marketing: "#3B82F6",
  production: "#22C55E",
  merch: "#F59E0B",
  equipment: "#C8102E",
};

const peso = (n: number) =>
  `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.08)",
  fontSize: 12,
};

export default function ReportsPage() {
  const { items, logs, damageRecords } = useInventory();
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const r = buildReport(items, logs, damageRecords, period);
  const periodText = PERIOD_LABELS[period].toLowerCase();

  function exportExcel() {
    downloadCSV(datedFilename(`report-${period}`), reportToCSV(r));
  }

  const topTimes = r.mostUsed[0]?.times || 1;
  const topCost = r.costByItem[0]?.cost || 1;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Period + export */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-2 print:hidden">
          {(Object.keys(PERIOD_LABELS) as ReportPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                period === p
                  ? "bg-primary text-white border-primary"
                  : "border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="hidden print:block text-lg font-semibold">
          InvenTrack Report: {PERIOD_LABELS[period]}
        </div>
        <div className="flex gap-2 sm:ml-auto print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-neutral-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-neutral-600 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 bg-primary text-white px-3 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" /> Download Excel
          </button>
        </div>
      </div>

      {/* Plain-language summary */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card">
        <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-sm text-foreground">
          {PERIOD_LABELS[period]}, staff made{" "}
          <b>{r.pullOuts.length} pull-out{r.pullOuts.length === 1 ? "" : "s"}</b>{" "}
          costing <b>{peso(r.totalCost)}</b>.{" "}
          <b>{r.borrowedNow.length}</b> item{r.borrowedNow.length === 1 ? " is" : "s are"}{" "}
          borrowed right now and <b>{r.needsRestock.length}</b> item
          {r.needsRestock.length === 1 ? " needs" : "s need"} restocking.
        </p>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          label="Total cost"
          value={peso(r.totalCost)}
          hint={`Materials ${peso(r.materialsCost)} + repairs ${peso(r.damageCost)}`}
        />
        <Kpi
          label="Pull-outs"
          value={String(r.pullOuts.length)}
          hint={`Times items were taken, ${periodText}`}
        />
        <Kpi
          label="Borrowed now"
          value={String(r.borrowedNow.length)}
          hint="Equipment not yet returned"
          warn={r.borrowedNow.length > 0}
        />
        <Kpi
          label="Need restocking"
          value={String(r.needsRestock.length)}
          hint="Low or out of stock"
          warn={r.needsRestock.length > 0}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card title="Pull-outs per month" hint="Last 6 months. Returned counts equipment brought back.">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={r.monthly} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.15)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="pullOuts" fill="#C8102E" radius={[4, 4, 0, 0]} name="Pull-outs" />
              <Bar dataKey="returned" fill="#22C55E" radius={[4, 4, 0, 0]} name="Returned" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Needs restocking" hint="Lowest stock first, compared to each item's alert number.">
          {r.needsRestock.length === 0 ? (
            <Empty text="All items are well stocked." />
          ) : (
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {r.needsRestock.map((item) => {
                const pct = Math.min(100, Math.round((item.stock / Math.max(item.minStock * 2, 1)) * 100));
                return (
                  <div key={item.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-foreground truncate">{item.name}</span>
                      <span className={item.stock === 0 ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"}>
                        {item.stock === 0 ? "Out of stock" : `${item.stock} ${item.unit} left`}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.stock === 0 ? "bg-red-500" : "bg-yellow-500"}`}
                        style={{ width: `${Math.max(pct, 3)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Most used items" hint={`How many times each item was pulled out, ${periodText}.`}>
          {r.mostUsed.length === 0 ? (
            <Empty text="No pull-outs in this period." />
          ) : (
            <RankList rows={r.mostUsed.map((m) => ({ name: m.name, value: m.times, label: `${m.times}x` }))} max={topTimes} />
          )}
        </Card>

        <Card title="Where the money goes" hint={`Items that cost the most, ${periodText} (materials and repairs).`}>
          {r.costByItem.length === 0 ? (
            <Empty text="No costs in this period. Add a pack price to items to track costs." />
          ) : (
            <RankList rows={r.costByItem.map((c) => ({ name: c.name, value: c.cost, label: peso(c.cost) }))} max={topCost} />
          )}
        </Card>

        <Card title="What's in inventory" hint="Number of items in each category.">
          <div className="flex items-center">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie data={r.byCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {r.byCategory.map((c) => (
                    <Cell key={c.key} fill={CHART_COLORS[c.key]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {r.byCategory.map((c) => (
                <div key={c.key} className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[c.key] }} />
                  <span className="text-foreground flex-1">{c.name}</span>
                  <span className="font-semibold text-foreground">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Borrowed right now" hint="Equipment that has not come back yet.">
          {r.borrowedNow.length === 0 ? (
            <Empty text="Nothing is borrowed right now." />
          ) : (
            <div className="divide-y divide-border max-h-[200px] overflow-y-auto">
              {r.borrowedNow.map((l) => (
                <div key={l.id} className="flex justify-between gap-3 py-2 text-sm">
                  <span className="text-foreground truncate">
                    {l.item} <span className="text-muted-foreground">({l.qty})</span>
                  </span>
                  <span className="text-muted-foreground text-xs flex-shrink-0">
                    {l.employee} · since {l.borrowDate}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card
        title="Damage records"
        hint="Added when borrowed equipment comes back damaged. Only the repair cost counts toward Total cost, not the item's full price."
      >
        {r.damage.length === 0 ? (
          <Empty text="No damage records in this period." />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="bg-muted/50 border-y border-border">
                  {["Date", "Item", "What happened", "Cost", "Logged by", "Receipt"].map((h) => (
                    <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {r.damage.map((d) => (
                  <tr key={d.id}>
                    <td className="px-5 py-2.5 text-sm text-muted-foreground whitespace-nowrap">{d.date}</td>
                    <td className="px-5 py-2.5 text-sm text-foreground whitespace-nowrap">{d.item}</td>
                    <td className="px-5 py-2.5 text-sm text-foreground">{d.title}</td>
                    <td className="px-5 py-2.5 text-sm font-medium text-foreground whitespace-nowrap">{peso(d.cost)}</td>
                    <td className="px-5 py-2.5 text-sm text-muted-foreground whitespace-nowrap">{d.createdBy || "-"}</td>
                    <td className="px-5 py-2.5 text-sm">
                      <a href={d.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Kpi({ label, value, hint, warn }: { label: string; value: string; hint: string; warn?: boolean }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${warn ? "text-primary" : "text-foreground"}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{hint}</div>
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm break-inside-avoid">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground mt-0.5 mb-4">{hint}</p>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-6 text-center">{text}</p>;
}

function RankList({ rows, max }: { rows: { name: string; value: number; label: string }[]; max: number }) {
  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={row.name} className="flex items-center gap-3">
          <span className="w-5 text-xs font-bold text-muted-foreground text-right">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-2 text-sm mb-1">
              <span className="text-foreground font-medium truncate">{row.name}</span>
              <span className="text-muted-foreground flex-shrink-0">{row.label}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${(row.value / max) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
