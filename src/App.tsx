import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  History,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  LogOut,
  PackagePlus,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import AddItem from "./pages/AddItem";
import Requests from "./pages/Requests";
import RestockPage from "./pages/RestockPage";
import HistoryPage from "./pages/HistoryPage";
import EmployeesPage from "./pages/Employees";
import ReportsPage from "./pages/Reports";
import SettingsPage from "./pages/Settings";
import Avatar from "./components/Avatar";

const ALL_NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, adminOnly: true },
  { label: "Inventory", icon: Package, adminOnly: false },
  { label: "Requests", icon: ClipboardList, adminOnly: false },
  { label: "Restock", icon: PackagePlus, adminOnly: false },
  { label: "History", icon: History, adminOnly: false },
  { label: "Employees", icon: Users, adminOnly: true },
  { label: "Reports", icon: BarChart3, adminOnly: true },
  { label: "Settings", icon: SettingsIcon, adminOnly: true },
];

const STAFF_ALLOWED_PAGES = ["Inventory", "Requests", "Restock", "History"];

export default function App() {
  const { currentStaff, loading, logout } = useAuth();
  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isAdmin = currentStaff?.role === "admin";

  useEffect(() => {
    if (currentStaff && !isAdmin && !STAFF_ALLOWED_PAGES.includes(activePage)) {
      setActivePage("Inventory");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStaff]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!currentStaff) {
    return <Login />;
  }

  const navItems = ALL_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  function selectPage(page: string) {
    setActivePage(page);
    setMobileNavOpen(false);
  }

  // "Add Item" isn't in the sidebar nav (it's reached via the Inventory page's
  // button) but it's still a real page admins can land on.
  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return isAdmin ? (
          <Dashboard setPage={setActivePage} />
        ) : (
          <Inventory setPage={setActivePage} />
        );
      case "Inventory":
        return <Inventory setPage={setActivePage} />;
      case "Add Item":
        return isAdmin ? (
          <AddItem setPage={setActivePage} />
        ) : (
          <Inventory setPage={setActivePage} />
        );
      case "Requests":
        return <Requests />;
      case "Restock":
        return <RestockPage />;
      case "History":
        return <HistoryPage />;
      case "Employees":
        return isAdmin ? (
          <EmployeesPage setPage={setActivePage} />
        ) : (
          <Inventory setPage={setActivePage} />
        );
      case "Reports":
        return isAdmin ? (
          <ReportsPage />
        ) : (
          <Inventory setPage={setActivePage} />
        );
      case "Settings":
        return isAdmin ? (
          <SettingsPage />
        ) : (
          <Inventory setPage={setActivePage} />
        );
      default:
        return <Inventory setPage={setActivePage} />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside
        className={`hidden md:flex ${sidebarCollapsed ? "w-16" : "w-56"} flex-shrink-0 bg-card border-r border-border flex-col transition-all duration-200`}
      >
        <div
          className={`flex items-center gap-3 px-4 py-4 border-b border-border ${sidebarCollapsed ? "justify-center" : ""}`}
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold text-foreground leading-tight">
                InvenTrack
              </div>
              <div className="text-xs text-muted-foreground">
                Creative Dept.
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = activePage === item.label;
            return (
              <button
                key={item.label}
                onClick={() => setActivePage(item.label)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  active
                    ? "bg-accent text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <item.icon
                  className={`w-4 h-4 flex-shrink-0 ${active ? "text-primary" : ""}`}
                />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted/50 text-sm transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg">
            <Avatar name={currentStaff.name} />
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">
                    {currentStaff.name}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {currentStaff.role}
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile nav backdrop */}
      {mobileNavOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Mobile slide-out drawer */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-foreground leading-tight">
              InvenTrack
            </div>
            <div className="text-xs text-muted-foreground">
              Creative Dept.
            </div>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = activePage === item.label;
            return (
              <button
                key={item.label}
                onClick={() => selectPage(item.label)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  active
                    ? "bg-accent text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <item.icon
                  className={`w-4 h-4 flex-shrink-0 ${active ? "text-primary" : ""}`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg">
            <Avatar name={currentStaff.name} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-foreground truncate">
                {currentStaff.name}
              </div>
              <div className="text-xs text-muted-foreground capitalize">
                {currentStaff.role}
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-card border-b border-border flex items-center px-4 md:px-5 gap-3 md:gap-4 flex-shrink-0">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden p-1.5 -ml-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">
            {activePage}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto">{renderPage()}</main>
      </div>
    </div>
  );
}
