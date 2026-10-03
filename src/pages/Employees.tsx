import { useState } from "react";
import { Search, UserPlus, ShieldCheck, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useInventory } from "../context/InventoryContext";
import Avatar from "../components/Avatar";

export default function EmployeesPage({
  setPage,
}: {
  setPage: (p: string) => void;
}) {
  const { staffList, currentStaff, updateStaffRole } = useAuth();
  const { logs } = useInventory();
  const [search, setSearch] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<{
    id: string;
    name: string;
    newRole: "admin" | "staff";
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const adminCount = staffList.filter((s) => s.role === "admin").length;
  const staffCount = staffList.length - adminCount;

  // You first, then admins, then everyone else A to Z.
  const filtered = staffList
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const rank = (s: typeof a) =>
        s.id === currentStaff?.id ? 0 : s.role === "admin" ? 1 : 2;
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    });

  // Activity is counted by the staff account that was logged in when the
  // pull-out was confirmed (logs.confirmedBy).
  function activity(name: string) {
    const own = logs.filter((l) => l.confirmedBy === name);
    return {
      total: own.length,
      stillOut: own.filter((l) => l.status === "active" && l.needsReturn).length,
      recent: own.slice(0, 3), // logs are already newest first
    };
  }

  async function handleConfirmRoleChange() {
    if (!confirmTarget) return;
    setBusy(true);
    setError("");
    const result = await updateStaffRole(confirmTarget.id, confirmTarget.newRole);
    setBusy(false);
    if (!result.ok) {
      setError(result.message || "Could not update this staff account's role.");
      return;
    }
    setConfirmTarget(null);
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Search + add */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff..."
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <button
          onClick={() => setPage("Settings")}
          className="sm:ml-auto flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <UserPlus className="w-4 h-4" /> Add staff or reset PIN
        </button>
      </div>

      {/* What the roles mean */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-start gap-3 p-4 bg-card rounded-xl border border-border">
          <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-foreground">
              Admin <span className="text-muted-foreground font-normal">({adminCount})</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Full access: Dashboard, Employees, Reports, Settings, and managing items and staff.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-card rounded-xl border border-border">
          <User className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-foreground">
              Staff <span className="text-muted-foreground font-normal">({staffCount})</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Day-to-day use: Inventory, Requests (pull-outs and History Log), and Restock.
            </p>
          </div>
        </div>
      </div>

      {/* Staff cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => {
          const a = activity(s.name);
          const isAdmin = s.role === "admin";
          const isLastAdmin = isAdmin && adminCount <= 1;
          const isYou = s.id === currentStaff?.id;
          return (
            <div key={s.id} className="bg-card rounded-xl border border-border shadow-sm p-5 flex flex-col">
              <div className="flex items-center gap-3">
                <Avatar name={s.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground text-sm truncate">
                    {s.name}
                    {isYou && <span className="text-muted-foreground font-normal"> (you)</span>}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-full ${
                      isAdmin ? "bg-accent text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {isAdmin ? "Admin" : "Staff"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center mt-4">
                <div className="bg-muted/50 rounded-lg py-2">
                  <div className="text-lg font-bold text-foreground">{a.total}</div>
                  <div className="text-xs text-muted-foreground">Pull-outs logged</div>
                </div>
                <div className="bg-muted/50 rounded-lg py-2">
                  <div className={`text-lg font-bold ${a.stillOut > 0 ? "text-primary" : "text-muted-foreground"}`}>
                    {a.stillOut}
                  </div>
                  <div className="text-xs text-muted-foreground">Not yet returned</div>
                </div>
              </div>

              <div className="mt-4 flex-1">
                <div className="text-xs font-medium text-muted-foreground mb-1.5">Recent activity</div>
                {a.recent.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No pull-outs logged yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {a.recent.map((l) => (
                      <li key={l.id} className="flex justify-between gap-2 text-xs">
                        <span className="text-foreground truncate">
                          {l.item} <span className="text-muted-foreground">×{l.qty}</span>
                        </span>
                        <span className="text-muted-foreground flex-shrink-0">{l.borrowDate}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                onClick={() =>
                  setConfirmTarget({ id: s.id, name: s.name, newRole: isAdmin ? "staff" : "admin" })
                }
                disabled={isLastAdmin}
                title={isLastAdmin ? "You need at least one admin. Make someone else admin first." : undefined}
                className="mt-4 w-full py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                {isLastAdmin ? "Only admin (can't change)" : isAdmin ? "Change to Staff" : "Make Admin"}
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
            No staff found.
          </div>
        )}
      </div>

      {confirmTarget && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => !busy && setConfirmTarget(null)}
        >
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {confirmTarget.newRole === "admin" ? "Make Admin?" : "Change to Staff?"}
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              <span className="font-medium text-foreground">{confirmTarget.name}</span>{" "}
              {confirmTarget.newRole === "admin"
                ? "will get full access, including Dashboard, Employees, Reports, Settings, and managing items and staff."
                : "will only see Inventory, Requests, and Restock, and will lose access to Dashboard, Employees, Reports, and Settings."}
            </p>
            {error && <p className="text-xs text-destructive mb-4">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmTarget(null)}
                disabled={busy}
                className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRoleChange}
                disabled={busy}
                className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {busy ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
