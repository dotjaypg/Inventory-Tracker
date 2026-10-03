import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  PackagePlus,
  PackageX,
  Plus,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { useInventory } from "../context/InventoryContext";
import { useAuth } from "../context/AuthContext";
import { getStockStatus } from "../types";
import { getClearReminder } from "../lib/history";
import { daysSince } from "../lib/notifications";
import { buildMonthlyUsage, usageToCSV } from "../lib/report";
import { downloadCSV, datedFilename } from "../lib/csv";
import ItemIcon from "../components/ItemIcon";

const peso = (n: number) =>
  `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Dashboard({ setPage }: { setPage: (p: string) => void }) {
  const { items, logs, restocks, damageRecords, lastClearedAt, notificationSettings } =
    useInventory();
  const { currentStaff } = useAuth();

  const now = new Date();
  const thisMonth = buildMonthlyUsage(logs, damageRecords, restocks, items, now.getFullYear(), now.getMonth());
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = buildMonthlyUsage(logs, damageRecords, restocks, items, lastMonthDate.getFullYear(), lastMonthDate.getMonth());

  const outItems = items.filter((i) => getStockStatus(i) === "out");
  const lowItems = items.filter((i) => getStockStatus(i) === "low");
  const borrowed = logs
    .filter((l) => l.status === "active" && l.needsReturn)
    .map((l) => ({ ...l, days: daysSince(l.borrowDate) }))
    .sort((a, b) => b.days - a.days);
  const overdue = borrowed.filter((l) => l.days > notificationSettings.overdueDays);
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const pullOutsThisMonth = logs.filter((l) => l.borrowDate.startsWith(monthPrefix)).length;

  const { due: reminderDue, daysSinceCleared, oldestRecordDays } = getClearReminder(
    lastClearedAt,
    logs,
    restocks,
  );

  const attentionCount = overdue.length + outItems.length + lowItems.length;
  const costDiff = thisMonth.totalCost - lastMonth.totalCost;

  // Recent activity: pull-outs, returns and restocks, newest first.
  const activity = [
    ...logs.map((l) => ({
      date: l.borrowDate,
      text: `${l.employee} took ${l.qty} ${l.unit} of ${l.item}`,
      kind: "out" as const,
    })),
    ...logs
      .filter((l) => l.needsReturn && l.returnedAt)
      .map((l) => ({ date: l.returnedAt!.slice(0, 10), text: `${l.item} was returned by ${l.employee}`, kind: "in" as const })),
    ...restocks.map((r) => ({ date: r.date, text: `${r.name} added ${r.qty} ${r.item}`, kind: "restock" as const })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl">
      {/* Greeting + quick actions */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {greeting()}, {currentStaff?.name}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {attentionCount === 0
              ? "Everything looks good today. Nothing needs your attention."
              : `${attentionCount} thing${attentionCount === 1 ? " needs" : "s need"} your attention below.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:ml-auto">
          <QuickAction icon={Plus} label="Add item" primary onClick={() => setPage("Add Item")} />
          <QuickAction icon={ClipboardList} label="Pull out" onClick={() => setPage("Requests")} />
          <QuickAction icon={PackagePlus} label="Restock" onClick={() => setPage("Restock")} />
          <QuickAction
            icon={Download}
            label="Export report"
            title="Download this month's usage report (opens in Excel)"
            onClick={() =>
              downloadCSV(
                datedFilename(`report-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`),
                usageToCSV(thisMonth),
              )
            }
          />
        </div>
      </div>

      {/* Key numbers, each explained in words */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Used this month"
          value={peso(thisMonth.totalCost)}
          note={
            lastMonth.totalCost === 0 && thisMonth.totalCost === 0
              ? "No costs yet"
              : `${costDiff >= 0 ? "+" : "-"}${peso(Math.abs(costDiff))} vs last month`
          }
          onClick={() => setPage("Reports")}
        />
        <Stat label="Pull-outs this month" value={String(pullOutsThisMonth)} note="Materials and equipment" onClick={() => setPage("Requests")} />
        <Stat
          label="Borrowed right now"
          value={String(borrowed.length)}
          note={overdue.length ? `${overdue.length} overdue` : "None overdue"}
          warn={overdue.length > 0}
          onClick={() => setPage("Requests")}
        />
        <Stat
          label="Need restocking"
          value={String(outItems.length + lowItems.length)}
          note={`${outItems.length} out, ${lowItems.length} low`}
          warn={outItems.length > 0}
          onClick={() => setPage("Restock")}
        />
      </div>

      {reminderDue && (
        <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/40 rounded-lg border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-700 dark:text-yellow-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">
            {daysSinceCleared === null
              ? `Your oldest record is ${oldestRecordDays} days old. Consider clearing old history.`
              : `It's been ${daysSinceCleared} days since history was cleared.`}
          </span>
          <button onClick={() => setPage("Settings")} className="text-xs font-medium underline hover:no-underline">
            Review
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Needs attention */}
        <Panel title="Needs attention" action={attentionCount ? { label: "Restock", onClick: () => setPage("Restock") } : undefined}>
          {attentionCount === 0 ? (
            <div className="flex items-center gap-3 py-6 justify-center text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-5 h-5" /> All items are stocked and nothing is overdue.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {overdue.slice(0, 5).map((l) => (
                <Row
                  key={l.id}
                  icon={<Clock className="w-4 h-4 text-red-600 dark:text-red-400" />}
                  title={`${l.item} is overdue`}
                  sub={`${l.employee} has had it for ${l.days} days`}
                  onClick={() => setPage("Requests")}
                />
              ))}
              {outItems.slice(0, 5).map((i) => (
                <Row
                  key={`out-${i.id}`}
                  icon={<PackageX className="w-4 h-4 text-red-600 dark:text-red-400" />}
                  title={`${i.name} is out of stock`}
                  sub="Staff can't pull this out until it's restocked"
                  onClick={() => setPage("Restock")}
                />
              ))}
              {lowItems.slice(0, 5).map((i) => (
                <Row
                  key={`low-${i.id}`}
                  icon={<AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />}
                  title={`${i.name} is running low`}
                  sub={`${i.stock} ${i.unit} left, alert set at ${i.minStock}`}
                  onClick={() => setPage("Restock")}
                />
              ))}
            </ul>
          )}
        </Panel>

        {/* Borrowed right now */}
        <Panel title="Borrowed right now" action={borrowed.length ? { label: "History Log", onClick: () => setPage("Requests") } : undefined}>
          {borrowed.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No equipment is out right now.</p>
          ) : (
            <ul className="divide-y divide-border">
              {borrowed.slice(0, 6).map((l) => {
                const item = items.find((i) => i.id === l.itemId);
                const late = l.days > notificationSettings.overdueDays;
                return (
                  <li key={l.id} className="flex items-center gap-3 py-2.5">
                    <ItemIcon name={l.item} category={l.category} image={item?.image ?? null} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{l.item}</div>
                      <div className="text-xs text-muted-foreground truncate">{l.employee}</div>
                    </div>
                    <span className={`text-xs flex-shrink-0 ${late ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"}`}>
                      {l.days === 0 ? "Today" : `${l.days} day${l.days === 1 ? "" : "s"}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* This month's top materials */}
        <Panel title="Top materials this month" action={{ label: "Full report", onClick: () => setPage("Reports") }}>
          {thisMonth.materials.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No materials used yet this month.</p>
          ) : (
            <ul className="divide-y divide-border">
              {thisMonth.materials.slice(0, 5).map((m) => (
                <li key={`${m.item}|${m.unit}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="text-foreground truncate">{m.item}</span>
                  <span className="text-muted-foreground flex-shrink-0">
                    {m.qty.toLocaleString()} {m.unit}
                    {m.cost > 0 && <span className="text-foreground font-medium"> · {peso(m.cost)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Recent activity */}
        <Panel title="Recent activity">
          {activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((a, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      a.kind === "out" ? "bg-primary" : a.kind === "in" ? "bg-green-500" : "bg-blue-500"
                    }`}
                  />
                  <span className="flex-1 text-foreground">{a.text}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{a.date}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
  primary,
  title,
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
  primary?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        primary ? "bg-primary text-white hover:opacity-90" : "bg-card border border-border text-foreground hover:bg-muted/50"
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function Stat({
  label,
  value,
  note,
  warn,
  onClick,
}: {
  label: string;
  value: string;
  note: string;
  warn?: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="text-left bg-card rounded-xl border border-border p-4 shadow-sm hover:border-primary transition-colors">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold text-foreground mt-1">{value}</div>
      <div className={`text-xs mt-1 ${warn ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"}`}>{note}</div>
    </button>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {action && (
          <button onClick={action.onClick} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            {action.label} <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Row({ icon, title, sub, onClick }: { icon: React.ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <li>
      <button onClick={onClick} className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-muted/30 rounded-md px-1 -mx-1">
        {icon}
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium text-foreground truncate">{title}</span>
          <span className="block text-xs text-muted-foreground truncate">{sub}</span>
        </span>
      </button>
    </li>
  );
}
