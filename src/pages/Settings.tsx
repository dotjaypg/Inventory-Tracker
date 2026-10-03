import { useRef, useState } from "react";
import {
  UserCog,
  Database,
  Bell,
  Plus,
  RotateCcw,
  Trash2,
  X,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useInventory } from "../context/InventoryContext";
import Avatar from "../components/Avatar";
import { csvTemplate, downloadCSV, parseInventoryCSV } from "../lib/csv";
import { getClearReminder } from "../lib/history";

const sections = [
  { id: "users", label: "Staff & PINs", icon: UserCog },
  { id: "database", label: "Database", icon: Database },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("users");
  const { staffList, addStaff, resetPin, deleteStaff, currentStaff } =
    useAuth();
  const {
    items,
    logs,
    restocks,
    damageRecords,
    usingMockData,
    addItem,
    dbSizeMb,
    lastClearedAt,
    clearHistory,
  } = useInventory();

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "staff">("staff");
  const [formError, setFormError] = useState("");

  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetPinValue, setResetPinValue] = useState("");

  const [deleteStaffTarget, setDeleteStaffTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deletingStaff, setDeletingStaff] = useState(false);
  const [deleteStaffError, setDeleteStaffError] = useState("");

  const [bulkImportBusy, setBulkImportBusy] = useState(false);
  const [bulkImportResult, setBulkImportResult] = useState<{
    added: number;
    errors: string[];
  } | null>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  const [showClearModal, setShowClearModal] = useState(false);
  const [clearLogsChecked, setClearLogsChecked] = useState(true);
  const [clearRestocksChecked, setClearRestocksChecked] = useState(true);
  const [clearBusy, setClearBusy] = useState(false);
  const [clearError, setClearError] = useState("");
  const [clearDone, setClearDone] = useState(false);

  const {
    due: monthlyReminderDue,
    daysSinceCleared,
    oldestRecordDays,
  } = getClearReminder(lastClearedAt, logs, restocks);

  async function handleClearHistory() {
    setClearBusy(true);
    setClearError("");
    const result = await clearHistory(clearLogsChecked, clearRestocksChecked);
    setClearBusy(false);
    if (!result.ok) {
      setClearError(result.message || "Could not clear history.");
      return;
    }
    setClearDone(true);
    setTimeout(() => {
      setClearDone(false);
      setShowClearModal(false);
    }, 900);
  }

  function handleDownloadTemplate() {
    downloadCSV("inventory-template.csv", csvTemplate());
  }

  function handleBulkImportClick() {
    setBulkImportResult(null);
    bulkFileInputRef.current?.click();
  }

  async function handleBulkFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setBulkImportBusy(true);
    setBulkImportResult(null);
    const text = await file.text();
    const { rows, errors } = parseInventoryCSV(text);

    let added = 0;
    for (const row of rows) {
      const result = await addItem({ ...row, image: null });
      if (result.ok) added++;
      else errors.push(`"${row.name}": ${result.message || "failed to add."}`);
    }

    setBulkImportBusy(false);
    setBulkImportResult({ added, errors });
  }

  async function handleAddStaff() {
    if (!newName.trim()) {
      setFormError("Enter a name.");
      return;
    }
    const result = await addStaff(newName.trim(), newPin, newRole);
    if (!result.ok) {
      setFormError(result.message || "Could not add staff.");
      return;
    }
    setShowAdd(false);
    setNewName("");
    setNewPin("");
    setNewRole("staff");
    setFormError("");
  }

  async function handleResetPin() {
    if (!resetTargetId) return;
    const result = await resetPin(resetTargetId, resetPinValue);
    if (result.ok) {
      setResetTargetId(null);
      setResetPinValue("");
    }
  }

  async function handleDeleteStaff() {
    if (!deleteStaffTarget) return;
    if (deleteStaffTarget.id === currentStaff?.id) {
      setDeleteStaffError(
        "You can't delete the account you're currently logged in as.",
      );
      return;
    }
    const target = staffList.find((s) => s.id === deleteStaffTarget.id);
    const adminCount = staffList.filter((s) => s.role === "admin").length;
    if (target?.role === "admin" && adminCount <= 1) {
      setDeleteStaffError(
        "You can't delete the last remaining admin account — the app needs at least one admin.",
      );
      return;
    }
    setDeletingStaff(true);
    setDeleteStaffError("");
    const result = await deleteStaff(deleteStaffTarget.id);
    setDeletingStaff(false);
    if (!result.ok) {
      setDeleteStaffError(
        result.message || "Could not delete this staff account.",
      );
      return;
    }
    setDeleteStaffTarget(null);
  }

  return (
    <div className="flex flex-col md:flex-row h-full">
      <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible border-b md:border-b-0 md:border-r border-border p-2 md:p-4 md:w-52 flex-shrink-0">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex-shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg text-sm font-medium text-left transition-colors whitespace-nowrap ${
              activeSection === s.id
                ? "bg-accent text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <s.icon className="w-4 h-4 flex-shrink-0" />
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-w-0">
        {activeSection === "users" && (
          <div className="max-w-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-lg">
                Staff & PINs
              </h3>
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" /> Add Staff
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Each person signs in with their name and their own PIN — that's
              what attributes every borrow and turn-back to the right person.
            </p>
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="divide-y divide-border">
                {staffList.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={s.name} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">
                        {s.name}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {s.role}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setDeleteStaffTarget({ id: s.id, name: s.name });
                        setDeleteStaffError("");
                      }}
                      className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
                      title="Delete staff"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setResetTargetId(s.id);
                        setResetPinValue("");
                      }}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Reset PIN"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {staffList.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No staff yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSection === "database" && (
          <div className="max-w-xl space-y-5">
            <h3 className="font-semibold text-foreground text-lg">Database</h3>
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
              {usingMockData ? (
                <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/40 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                    Running on local demo data — add your Supabase keys to .env
                    to connect a real database.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/40 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    Connected to Supabase
                  </span>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-muted/50 rounded-lg py-3">
                  <div className="text-xl font-bold text-foreground">
                    {items.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Items</div>
                </div>
                <div className="bg-muted/50 rounded-lg py-3">
                  <div className="text-xl font-bold text-foreground">
                    {logs.length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Log entries
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg py-3">
                  <div className="text-xl font-bold text-foreground">
                    {staffList.length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Staff accounts
                  </div>
                </div>
              </div>

              {!usingMockData && dbSizeMb !== null && (
                <div>
                  {(() => {
                    // Supabase's free tier gives 500 MB of database storage.
                    // This bar is just a visual heads-up, not a hard limit —
                    // Supabase itself is the source of truth for actual usage.
                    const FREE_TIER_LIMIT_MB = 500;
                    const pct = Math.min(
                      100,
                      Math.round((dbSizeMb / FREE_TIER_LIMIT_MB) * 100),
                    );
                    const color =
                      pct >= 90
                        ? "bg-red-500"
                        : pct >= 70
                          ? "bg-yellow-500"
                          : "bg-green-500";
                    const label =
                      pct >= 90
                        ? "Nearly full"
                        : pct >= 70
                          ? "Getting full"
                          : "Healthy";
                    const labelColor =
                      pct >= 90
                        ? "text-red-600 dark:text-red-400"
                        : pct >= 70
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-green-600 dark:text-green-400";
                    return (
                      <div className="flex items-center gap-3">
                        <HardDrive className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">
                              Database size:{" "}
                              <span className="font-medium text-foreground">
                                {dbSizeMb} MB
                              </span>{" "}
                              / {FREE_TIER_LIMIT_MB} MB
                            </span>
                            <span className={`font-medium ${labelColor}`}>
                              {label}
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${color} rounded-full transition-all`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {monthlyReminderDue && (
              <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/40 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                    {daysSinceCleared === null
                      ? `History hasn't been cleared yet. Your oldest record is ${oldestRecordDays} days old.`
                      : `It's been ${daysSinceCleared} days since history was last cleared.`}
                  </p>
                  <p className="text-xs text-yellow-700/80 dark:text-yellow-300/80 mt-0.5">
                    Clearing old pull-out and restock logs keeps the database
                    lean. Damage records and item data are never affected.
                  </p>
                </div>
                <button
                  onClick={() => setShowClearModal(true)}
                  className="flex-shrink-0 text-xs font-medium text-yellow-700 dark:text-yellow-300 underline hover:no-underline"
                >
                  Clear now
                </button>
              </div>
            )}

            <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  Clear History
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Permanently deletes old records to keep the database lean.
                  This does <span className="font-medium">not</span> touch your
                  items, staff accounts, or damage records (kept for
                  financial/audit purposes) — only pull-out logs and/or restock
                  history, whichever you choose below.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{logs.length} log entries</span>
                <span>·</span>
                <span>{restocks.length} restock entries</span>
                <span>·</span>
                <span>
                  {damageRecords.length} damage records (never cleared here)
                </span>
              </div>
              <button
                onClick={() => setShowClearModal(true)}
                className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 px-3 py-2 rounded-lg text-xs font-medium hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear History…
              </button>
            </div>

            <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  Bulk Import Items
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Download the template, fill it in with your items (name,
                  category, stock, unit, min/max stock, location, supplier,
                  description), then upload it here to add them all at once. The
                  Export button on the Inventory page produces a file in this
                  same format.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 bg-neutral-700 dark:bg-neutral-700 text-white border border-transparent px-3 py-2 rounded-lg text-xs font-medium hover:bg-neutral-600 dark:hover:bg-neutral-600 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download Template
                </button>
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleBulkFileChange}
                />
                <button
                  onClick={handleBulkImportClick}
                  disabled={bulkImportBusy}
                  className="flex items-center gap-2 bg-primary text-white px-3 py-2 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />{" "}
                  {bulkImportBusy ? "Importing…" : "Upload Filled Template"}
                </button>
              </div>
              {bulkImportResult && (
                <div
                  className={`rounded-lg border px-4 py-3 text-xs flex items-start gap-2 ${
                    bulkImportResult.errors.length
                      ? "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950/40 dark:border-yellow-800 dark:text-yellow-300"
                      : "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/40 dark:border-green-800 dark:text-green-300"
                  }`}
                >
                  {bulkImportResult.errors.length ? (
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">
                      {bulkImportResult.added} item
                      {bulkImportResult.added === 1 ? "" : "s"} imported
                      successfully.
                    </div>
                    {bulkImportResult.errors.length > 0 && (
                      <ul className="mt-1 space-y-0.5 list-disc list-inside">
                        {bulkImportResult.errors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    onClick={() => setBulkImportResult(null)}
                    className="p-0.5 hover:opacity-70"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === "notifications" && (
          <div className="max-w-xl space-y-5">
            <h3 className="font-semibold text-foreground text-lg">
              Notification Settings
            </h3>
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
              <p className="text-sm text-muted-foreground">
                Not wired up yet — this is a placeholder for when email/SMS
                alerts get added later.
              </p>
              {["Low stock alerts", "New borrow requests", "Overdue items"].map(
                (label) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <span className="text-sm text-foreground">{label}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        defaultChecked
                        disabled
                      />
                      <div className="w-10 h-5 bg-muted peer-checked:bg-primary rounded-full opacity-50" />
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-all" />
                    </label>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add staff modal */}
      {showAdd && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground">
                Add Staff
              </h3>
              <button
                onClick={() => setShowAdd(false)}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Name
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  PIN (4–6 digits)
                </label>
                <input
                  value={newPin}
                  onChange={(e) =>
                    setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  placeholder="••••"
                  className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) =>
                    setNewRole(e.target.value as "admin" | "staff")
                  }
                  className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {formError && (
                <p className="text-xs text-destructive">{formError}</p>
              )}
              <button
                onClick={handleAddStaff}
                className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Add Staff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset PIN modal */}
      {resetTargetId && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setResetTargetId(null)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Reset PIN
            </h3>
            <input
              value={resetPinValue}
              onChange={(e) =>
                setResetPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              placeholder="New PIN"
              className="w-full px-3 py-2 bg-input-background border border-border rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <button
              onClick={handleResetPin}
              className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Save new PIN
            </button>
          </div>
        </div>
      )}

      {/* Delete staff modal */}
      {deleteStaffTarget && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setDeleteStaffTarget(null)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Delete staff account?
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              This will permanently remove{" "}
              <span className="font-medium text-foreground">
                {deleteStaffTarget.name}
              </span>
              's login. Their past pull-out and restock history stays intact —
              this only removes their ability to sign in. This can't be undone.
            </p>
            {deleteStaffError && (
              <p className="text-xs text-destructive mb-4">
                {deleteStaffError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteStaffTarget(null)}
                className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStaff}
                disabled={deletingStaff}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deletingStaff ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => !clearBusy && setShowClearModal(false)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Clear History
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              This permanently deletes the selected records. Items, staff
              accounts, and damage records are never affected. This can't be
              undone.
            </p>
            <div className="space-y-2 mb-4">
              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={clearLogsChecked}
                  onChange={(e) => setClearLogsChecked(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-foreground">
                  Pull-out / borrow logs{" "}
                  <span className="text-muted-foreground">({logs.length})</span>
                </span>
              </label>
              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={clearRestocksChecked}
                  onChange={(e) => setClearRestocksChecked(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-foreground">
                  Restock history{" "}
                  <span className="text-muted-foreground">
                    ({restocks.length})
                  </span>
                </span>
              </label>
            </div>
            {clearError && (
              <p className="text-xs text-destructive mb-4">{clearError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                disabled={clearBusy}
                className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClearHistory}
                disabled={
                  clearBusy || (!clearLogsChecked && !clearRestocksChecked)
                }
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {clearDone ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Cleared!
                  </>
                ) : clearBusy ? (
                  "Clearing…"
                ) : (
                  "Clear History"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
