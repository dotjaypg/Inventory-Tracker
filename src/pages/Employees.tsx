import { useState } from "react";
import { Search, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useInventory } from "../context/InventoryContext";
import Avatar from "../components/Avatar";

export default function EmployeesPage({
  setPage,
}: {
  setPage: (p: string) => void;
}) {
  const { staffList } = useAuth();
  const { logs } = useInventory();
  const [view, setView] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");

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
        <div className="ml-auto flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setView("cards")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "cards" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            Cards
          </button>
          <button
            onClick={() => setView("table")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            Table
          </button>
        </div>
        <button
          onClick={() => setPage("Settings")}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <SettingsIcon className="w-4 h-4" /> Manage Staff
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-5">
        This list mirrors your staff accounts from Settings → Staff &amp; PINs.
        To add, remove, or reset a login, use "Manage Staff" above.
      </p>

      {view === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((s) => {
            const stat = stats(s.name);
            return (
              <div
                key={s.id}
                className="bg-card rounded-xl border border-border shadow-sm p-5 hover:shadow-md transition-all"
              >
                <div className="flex flex-col items-center text-center mb-4">
                  <Avatar name={s.name} size="lg" />
                  <h4 className="font-semibold text-foreground mt-3 text-sm leading-snug">
                    {s.name}
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
      ) : (
        <>
        {/* Mobile card list */}
        <div className="md:hidden space-y-2">
          {filtered.map((s) => {
            const stat = stats(s.name);
            return (
              <div
                key={s.id}
                className="bg-card rounded-xl border border-border shadow-sm p-3 flex items-center gap-3"
              >
                <Avatar name={s.name} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    {s.name}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {s.role}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-foreground">
                    {stat.borrowed}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      pulled out
                    </span>
                  </div>
                  {stat.active > 0 ? (
                    <div className="text-xs text-primary font-semibold">
                      {stat.active} active
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">—</div>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No staff accounts found.
            </div>
          )}
        </div>

        <div className="hidden md:block bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {["Staff", "Role", "Pulled Out", "Active Requests"].map((h) => (
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
              {filtered.map((s) => {
                const stat = stats(s.name);
                return (
                  <tr
                    key={s.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} />
                        <div className="text-sm font-medium text-foreground">
                          {s.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground capitalize">
                      {s.role}
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-semibold text-foreground">
                      {stat.borrowed}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {stat.active > 0 ? (
                        <span className="inline-flex items-center gap-1 text-primary font-semibold">
                          <span className="w-2 h-2 bg-primary rounded-full inline-block" />
                          {stat.active}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No staff accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
