import { useState } from "react";
import {
  Search,
  Settings as SettingsIcon,
  MoreVertical,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    id: string;
    name: string;
    newRole: "admin" | "staff";
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const adminCount = staffList.filter((s) => s.role === "admin").length;

  const filtered = staffList.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  function stats(name: string) {
    const own = logs.filter((l) => l.employee === name);
    return {
      borrowed: own.length,
      active: own.filter((l) => l.status === "active").length,
    };
  }

  async function handleConfirmRoleChange() {
    if (!confirmTarget) return;
    setBusy(true);
    setError("");
    const result = await updateStaffRole(
      confirmTarget.id,
      confirmTarget.newRole,
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message || "Could not update this staff account's role.");
      return;
    }
    setConfirmTarget(null);
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center gap-3 mb-2">
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
          className="ml-auto flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <SettingsIcon className="w-4 h-4" /> Manage Staff
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-5">
        This list mirrors your staff accounts from Settings → Staff &amp; PINs.
        To add, remove, or reset a login, use "Manage Staff" above.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map((s) => {
          const stat = stats(s.name);
          const isLastAdmin = s.role === "admin" && adminCount <= 1;
          return (
            <div
              key={s.id}
              className="relative bg-card rounded-xl border border-border shadow-sm p-5 hover:shadow-md transition-all"
            >
              <div className="absolute top-3 right-3">
                <button
                  onClick={() =>
                    setOpenMenuId(openMenuId === s.id ? null : s.id)
                  }
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {openMenuId === s.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setOpenMenuId(null)}
                    />
                    <div className="absolute right-0 top-8 z-20 w-44 bg-card border border-border rounded-lg shadow-lg py-1">
                      {s.role === "staff" ? (
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            setConfirmTarget({
                              id: s.id,
                              name: s.name,
                              newRole: "admin",
                            });
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors text-left"
                        >
                          <ShieldCheck className="w-4 h-4 text-primary" /> Make
                          Admin
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            setConfirmTarget({
                              id: s.id,
                              name: s.name,
                              newRole: "staff",
                            });
                          }}
                          disabled={isLastAdmin}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          title={
                            isLastAdmin
                              ? "This is the last remaining admin"
                              : undefined
                          }
                        >
                          <ShieldOff className="w-4 h-4 text-muted-foreground" />{" "}
                          Make Staff
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col items-center text-center mb-4">
                <Avatar name={s.name} size="lg" />
                <h4 className="font-semibold text-foreground mt-3 text-sm leading-snug">
                  {s.name}
                  {s.id === currentStaff?.id && (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      (you)
                    </span>
                  )}
                </h4>
                <span className="mt-2 text-xs bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full capitalize">
                  {s.role}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-muted/50 rounded-lg py-2">
                  <div className="text-lg font-bold text-foreground">
                    {stat.borrowed}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Pulled Out
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg py-2">
                  <div
                    className={`text-lg font-bold ${stat.active > 0 ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {stat.active}
                  </div>
                  <div className="text-xs text-muted-foreground">Active</div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
            No staff accounts found.
          </div>
        )}
      </div>

      {confirmTarget && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => !busy && setConfirmTarget(null)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {confirmTarget.newRole === "admin"
                ? "Make Admin?"
                : "Make Staff?"}
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              {confirmTarget.newRole === "admin" ? (
                <>
                  <span className="font-medium text-foreground">
                    {confirmTarget.name}
                  </span>{" "}
                  will get full admin access — Dashboard, Employees, Reports,
                  Settings, and the ability to add/edit/delete items and manage
                  staff.
                </>
              ) : (
                <>
                  <span className="font-medium text-foreground">
                    {confirmTarget.name}
                  </span>{" "}
                  will be limited to Inventory, Requests, Restock, and History —
                  losing access to Dashboard, Employees, Reports, and Settings.
                </>
              )}
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
