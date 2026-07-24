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
    </div>
  );
}
