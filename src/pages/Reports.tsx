import { FileText, Download } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useInventory } from "../context/InventoryContext";
import { CATEGORIES, CategoryKey } from "../types";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function monthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function buildMonthlyBorrowData(
  logs: { borrowDate: string; returnedAt: string | null }[],
) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: MONTH_LABELS[d.getMonth()],
      borrowed: 0,
      returned: 0,
    });
  }
  const byKey = Object.fromEntries(months.map((m) => [m.key, m]));
  for (const log of logs) {
    if (log.borrowDate && byKey[monthKey(log.borrowDate)])
      byKey[monthKey(log.borrowDate)].borrowed++;
    if (log.returnedAt && byKey[monthKey(log.returnedAt)])
      byKey[monthKey(log.returnedAt)].returned++;
  }
  return months;
}

const CHART_COLORS: Record<CategoryKey, string> = {
  marketing: "#3B82F6",
  production: "#22C55E",
  merch: "#F59E0B",
  equipment: "#C8102E",
};

export default function ReportsPage() {
  const { items, logs, damageRecords } = useInventory();

  const monthlyBorrowData = buildMonthlyBorrowData(logs);

  const categoryData = (Object.keys(CATEGORIES) as CategoryKey[])
    .map((key) => ({
      name: CATEGORIES[key].label,
      value: items.filter((i) => i.category === key).length,
      color: CHART_COLORS[key],
    }))
    .filter((c) => c.value > 0);

  const mostBorrowed = Object.entries(
    logs.reduce<Record<string, number>>((acc, l) => {
      acc[l.item] = (acc[l.item] || 0) + l.qty;
      return acc;
    }, {}),
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topCount = mostBorrowed[0]?.count || 1;

  // Usage Cost = materials actually consumed (equipment log.cost is always 0 —
  // a normal borrow/return isn't a financial loss) + any repair/damage costs
  // actually incurred (from Damage Records, logged when equipment comes back
  // Damaged / Needs repair).
  const materialsCost = logs.reduce((sum, l) => sum + l.cost, 0);
  const damageCost = damageRecords.reduce((sum, d) => sum + d.cost, 0);
  const totalCost = materialsCost + damageCost;

  const now = new Date();
  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  };
  const thisMonthCost =
    logs
      .filter((l) => isThisMonth(l.borrowDate))
      .reduce((sum, l) => sum + l.cost, 0) +
    damageRecords
      .filter((d) => isThisMonth(d.date))
      .reduce((sum, d) => sum + d.cost, 0);

  const costByItem = Object.entries(
    [
      ...logs
        .filter((l) => l.cost > 0)
        .map((l) => ({ item: l.item, cost: l.cost })),
      ...damageRecords.map((d) => ({ item: d.item, cost: d.cost })),
    ].reduce<Record<string, number>>((acc, l) => {
      acc[l.item] = (acc[l.item] || 0) + l.cost;
      return acc;
    }, {}),
  )
    .map(([name, cost]) => ({ name, cost }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);
  const topCost = costByItem[0]?.cost || 1;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Reporting period: this month
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-neutral-700 dark:bg-neutral-700 text-white border border-transparent px-3 py-2 rounded-lg text-sm hover:bg-neutral-600 dark:hover:bg-neutral-600 transition-colors">
            <FileText className="w-4 h-4" /> Export PDF
          </button>
          <button className="flex items-center gap-2 bg-neutral-700 dark:bg-neutral-700 text-white border border-transparent px-3 py-2 rounded-lg text-sm hover:bg-neutral-600 dark:hover:bg-neutral-600 transition-colors">
            <Download className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            This Month's Usage Cost
          </div>
          <div className="text-2xl font-bold text-foreground">
            ₱{thisMonthCost.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Value of items pulled out this month
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            All-Time Usage Cost
          </div>
          <div className="text-2xl font-bold text-foreground">
            ₱{totalCost.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Total value of all pull-outs logged
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-5">
            Monthly Borrowing Trend
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyBorrowData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.08)",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="borrowed"
                fill="#C8102E"
                radius={[4, 4, 0, 0]}
                name="Borrowed"
              />
              <Bar
                dataKey="returned"
                fill="#22C55E"
                radius={[4, 4, 0, 0]}
                name="Returned"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-5">
            Category Distribution
          </h3>
          <div className="flex items-center">
            <ResponsiveContainer width="60%" height={220}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid rgba(0,0,0,0.08)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {categoryData.map((c) => (
                <div key={c.name} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-foreground flex-1">{c.name}</span>
                  <span className="font-semibold text-foreground">
                    {c.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-5">
            Most Borrowed Items
          </h3>
          <div className="space-y-3">
            {mostBorrowed.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No borrow activity yet.
              </p>
            )}
            {mostBorrowed.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="w-5 text-xs font-bold text-muted-foreground text-right">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground font-medium">
                      {item.name}
                    </span>
                    <span className="text-muted-foreground">{item.count}x</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(item.count / topCount) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-5">
            Highest Cost Items
          </h3>
          <div className="space-y-3">
            {costByItem.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No priced usage yet.
              </p>
            )}
            {costByItem.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="w-5 text-xs font-bold text-muted-foreground text-right">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground font-medium">
                      {item.name}
                    </span>
                    <span className="text-muted-foreground">
                      ₱{item.cost.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(item.cost / topCost) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-5">
            Stock Level Analysis
          </h3>
          <div className="space-y-4">
            {items.slice(0, 5).map((item) => {
              // No fixed "max stock" concept anymore — instead, we scale each bar against
              // 2x its own minimum-stock threshold, just to give a visual sense of how far
              // above/below the reorder point it currently sits.
              const refScale = Math.max(item.minStock * 2, 1);
              const pct = Math.min(
                100,
                Math.round((item.stock / refScale) * 100),
              );
              const color =
                item.stock <= item.minStock
                  ? "bg-red-500"
                  : pct < 50
                    ? "bg-yellow-500"
                    : "bg-green-500";
              return (
                <div key={item.id}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-foreground">
                      {item.name}
                    </span>
                    <span className="text-muted-foreground">
                      {item.stock} {item.unit}{" "}
                      <span className="text-xs">(min {item.minStock})</span>
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 pb-3">
          <h3 className="font-semibold text-foreground">Damage Records</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Logged when a returned equipment item is marked Damaged / Needs
            repair. Only these amounts — not the item's full value — count
            toward Usage Cost.
          </p>
        </div>
        {damageRecords.length === 0 ? (
          <div className="px-5 pb-5 text-sm text-muted-foreground">
            No damage records yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {[
                    "Date",
                    "Item",
                    "Title",
                    "Cost",
                    "Logged By",
                    "Receipt",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {damageRecords.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground whitespace-nowrap">
                      {d.date}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-foreground whitespace-nowrap">
                      {d.item}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-foreground">
                      {d.title}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-medium text-foreground whitespace-nowrap">
                      ₱{d.cost.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground whitespace-nowrap">
                      {d.createdBy || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-sm">
                      <a
                        href={d.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
