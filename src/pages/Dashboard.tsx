import {
  Package,
  X,
  AlertTriangle,
  ClipboardList,
  Plus,
  Download,
  Wallet,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useInventory } from "../context/InventoryContext";
import { getStockStatus, CATEGORIES } from "../types";
import { getClearReminder } from "../lib/history";
import { buildReport, reportToCSV } from "../lib/report";
import { downloadCSV, datedFilename } from "../lib/csv";
import StatusBadge from "../components/StatusBadge";
import Avatar from "../components/Avatar";
import ItemIcon from "../components/ItemIcon";

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

export default function Dashboard({
  setPage,
}: {
  setPage: (p: string) => void;
}) {
  const { items, logs, restocks, damageRecords, lastClearedAt } =
    useInventory();

  const low = items.filter((i) => getStockStatus(i) === "low").length;
  const out = items.filter((i) => getStockStatus(i) === "out").length;
  const active = logs.filter((l) => l.status === "active").length;

  const now = new Date();
  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  };
  const {
    due: monthlyReminderDue,
    daysSinceCleared,
    oldestRecordDays,
  } = getClearReminder(lastClearedAt, logs, restocks);
  // Usage Cost = materials actually consumed this month (equipment log.cost is
  // always 0 — a normal borrow/return isn't a financial loss) + any repair/
  // damage costs actually incurred this month.
  const thisMonthCost =
    logs
      .filter((l) => isThisMonth(l.borrowDate))
      .reduce((sum, l) => sum + l.cost, 0) +
    damageRecords
      .filter((d) => isThisMonth(d.date))
      .reduce((sum, d) => sum + d.cost, 0);

  const kpis = [
    {
      label: "Total Items",
      value: items.length,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/40",
      trend: `${items.length} tracked`,
    },
    {
      label: "Out of Stock",
      value: out,
      icon: X,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950/40",
      trend: out > 0 ? "Needs reorder" : "None — good",
    },
    {
      label: "Low Stock",
      value: low,
      icon: AlertTriangle,
      color: "text-yellow-600",
      bg: "bg-yellow-50 dark:bg-yellow-950/40",
      trend: "Needs restocking",
    },
    {
      label: "Active Borrows",
      value: active,
      icon: ClipboardList,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950/40",
      trend: "Currently out",
    },
    {
      label: "Usage Cost (This Month)",
      value: `₱${thisMonthCost.toFixed(2)}`,
      icon: Wallet,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950/40",
      trend: "Value pulled out",
    },
  ];

  const categoryStatus = (
    Object.keys(CATEGORIES) as Array<keyof typeof CATEGORIES>
  ).map((key) => {
    const inCat = items.filter((i) => i.category === key);
    const avail = inCat.filter((i) => getStockStatus(i) !== "out").length;
    return {
      label: CATEGORIES[key].label,
      available: avail,
      total: inCat.length,
    };
  });

  const lowStockItems = items.filter((i) => getStockStatus(i) !== "available");
  const recentLogs = [...logs]
    .sort((a, b) => (a.borrowDate < b.borrowDate ? 1 : -1))
    .slice(0, 4);
  const monthlyBorrowData = buildMonthlyBorrowData(logs);

  type ActivityEvent = {
    date: string;
    text: string;
    type: "request" | "return" | "alert" | "restock";
  };
  const activityEvents: ActivityEvent[] = [];
  for (const log of logs) {
    activityEvents.push({
      date: log.borrowDate,
      text: `${log.employee} pulled out ${log.qty} ${log.unit} of ${log.item}`,
      type: "request",
    });
    if (log.status === "returned" && log.returnedAt) {
      activityEvents.push({
        date: log.returnedAt.slice(0, 10),
        text: `${log.item} returned by ${log.employee} — stock restored`,
        type: "return",
      });
    }
  }
  for (const r of restocks) {
    activityEvents.push({
      date: r.date,
      text: `${r.name} restocked ${r.qty} of ${r.item}`,
      type: "restock",
    });
  }
  for (const item of items) {
    if (getStockStatus(item) === "out") {
      activityEvents.push({
        date: item.lastUpdated,
        text: `Stock alert: ${item.name} is now Out of Stock`,
        type: "alert",
      });
    }
  }
  const activities = activityEvents
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 flex items-center justify-end gap-2 sm:gap-3 flex-wrap bg-background/95 backdrop-blur-sm border-b border-border px-4 md:px-6 py-3">
        <button
          onClick={() => setPage("Add Item")}
          className="flex items-center gap-2 bg-primary text-white px-3 md:px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="w-4 h-4" />{" "}
          <span className="hidden sm:inline">Add Item</span>
        </button>
        <button
          onClick={() => setPage("Requests")}
          className="flex items-center gap-2 bg-neutral-700 dark:bg-neutral-700 text-white border border-transparent px-3 md:px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-neutral-600 dark:hover:bg-neutral-600 transition-colors shadow-sm"
        >
          <ClipboardList className="w-4 h-4" />{" "}
          <span className="hidden sm:inline">New Request</span>
        </button>
        <button
          onClick={() =>
            downloadCSV(
              datedFilename("report-month"),
              reportToCSV(buildReport(items, logs, damageRecords, "month")),
            )
          }
          title="Download this month's report (opens in Excel)"
          className="flex items-center gap-2 bg-neutral-700 dark:bg-neutral-700 text-white border border-transparent px-3 md:px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-neutral-600 dark:hover:bg-neutral-600 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />{" "}
          <span className="hidden sm:inline">Export Report</span>
        </button>
      </div>

      {monthlyReminderDue && (
        <div className="mx-4 md:mx-6 flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/40 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-yellow-700 dark:text-yellow-300 flex-1">
            {daysSinceCleared === null
              ? `History hasn't been cleared yet and your oldest record is ${oldestRecordDays} days old. `
              : `It's been ${daysSinceCleared} days since history was last cleared — `}
            head to <span className="font-medium">Settings → Database</span> to
            review and clear old records.
          </p>
          <button
            onClick={() => setPage("Settings")}
            className="flex-shrink-0 text-xs font-medium text-yellow-700 dark:text-yellow-300 underline hover:no-underline"
          >
            Go to Settings
          </button>
        </div>
      )}

      <div className="px-4 md:px-6 space-y-6 pb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="bg-card rounded-xl border border-border p-5 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`${k.bg} p-2.5 rounded-lg`}>
                  <k.icon className={`w-5 h-5 ${k.color}`} />
                </div>
                <span className="text-xs text-muted-foreground">{k.trend}</span>
              </div>
              <div className="text-3xl font-bold text-foreground mb-0.5">
                {k.value}
              </div>
              <div className="text-sm text-muted-foreground">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="col-span-2 bg-card rounded-xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-foreground">
                Monthly Borrowing Activity
              </h3>
              <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                Last 6 months
              </span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyBorrowData}>
                <defs>
                  <linearGradient id="borrowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C8102E" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#C8102E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,0,0,0.06)"
                />
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
                <Area
                  type="monotone"
                  dataKey="borrowed"
                  stroke="#C8102E"
                  strokeWidth={2}
                  fill="url(#borrowGrad)"
                  name="Borrowed"
                />
                <Area
                  type="monotone"
                  dataKey="returned"
                  stroke="#22C55E"
                  strokeWidth={2}
                  fill="none"
                  strokeDasharray="4 2"
                  name="Returned"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <h3 className="font-semibold text-foreground mb-4">
              Inventory Status
            </h3>
            <div className="space-y-4">
              {categoryStatus.map((s) => {
                const pct = s.total
                  ? Math.round((s.available / s.total) * 100)
                  : 0;
                const color =
                  pct === 0
                    ? "bg-red-500"
                    : pct < 40
                      ? "bg-yellow-500"
                      : "bg-green-500";
                return (
                  <div key={s.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-foreground font-medium">
                        {s.label}
                      </span>
                      <span className="text-muted-foreground">
                        {s.available}/{s.total}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="col-span-2 bg-card rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Recent Requests</h3>
              <button
                onClick={() => setPage("Requests")}
                className="text-xs text-primary font-medium hover:underline"
              >
                View all
              </button>
            </div>
            <div className="divide-y divide-border">
              {recentLogs.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors"
                >
                  <Avatar name={r.employee} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {r.employee}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        {r.id}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.item} × {r.qty}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">
                Low Stock Alerts
              </h3>
            </div>
            <div className="divide-y divide-border">
              {lowStockItems.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  All items well stocked
                </div>
              )}
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3"
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
                      {item.stock} remaining
                    </div>
                  </div>
                  <StatusBadge status={getStockStatus(item)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Recent Activity</h3>
          </div>
          <div className="p-5 space-y-4">
            {activities.map((a, i) => {
              const dotColor =
                a.type === "alert"
                  ? "bg-red-500"
                  : a.type === "return"
                    ? "bg-green-500"
                    : a.type === "restock"
                      ? "bg-blue-500"
                      : "bg-gray-400";
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1.5 flex flex-col items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                    {i < activities.length - 1 && (
                      <div className="w-px h-6 bg-border" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground leading-relaxed">
                      {a.text}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {a.date}
                    </span>
                  </div>
                </div>
              );
            })}
            {activities.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No activity yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
