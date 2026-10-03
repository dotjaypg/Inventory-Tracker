import { useEffect, useRef, useState } from "react";
import { Bell, AlertTriangle, PackageX, Clock, ClipboardList } from "lucide-react";
import { useInventory } from "../context/InventoryContext";
import { useAuth } from "../context/AuthContext";
import {
  buildNotifications,
  logNumber,
  NotificationKind,
} from "../lib/notifications";

const KIND_STYLE: Record<
  NotificationKind,
  { icon: typeof Bell; color: string; bg: string }
> = {
  overdue: {
    icon: Clock,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
  },
  out: {
    icon: PackageX,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
  },
  low: {
    icon: AlertTriangle,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-950/40",
  },
  new: {
    icon: ClipboardList,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
  },
};

// Remembers (per staff account, in this browser) the newest pull-out the
// person has already seen, so "new pull-out" alerts only show once.
function seenKey(staffId: string) {
  return `inventrack_seen_log_${staffId}`;
}
function readSeen(staffId: string): number | null {
  try {
    const v = localStorage.getItem(seenKey(staffId));
    return v === null ? null : Number(v) || 0;
  } catch {
    return null;
  }
}
function writeSeen(staffId: string, n: number) {
  try {
    localStorage.setItem(seenKey(staffId), String(n));
  } catch {
    /* ignore */
  }
}

export default function NotificationBell({
  setPage,
}: {
  setPage: (p: string) => void;
}) {
  const { items, logs, notificationSettings, loading } = useInventory();
  const { currentStaff } = useAuth();
  const isAdmin = currentStaff?.role === "admin";
  const staffId = currentStaff?.id ?? "";
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<number | null>(() =>
    staffId ? readSeen(staffId) : null,
  );
  const ref = useRef<HTMLDivElement>(null);

  const newestLog = logs.reduce((max, l) => Math.max(max, logNumber(l.id)), 0);

  // First time on this browser: treat existing pull-outs as already seen,
  // so the admin is not flooded with old records.
  useEffect(() => {
    if (!staffId || loading) return;
    const stored = readSeen(staffId);
    if (stored === null) {
      writeSeen(staffId, newestLog);
      setLastSeen(newestLog);
    } else {
      setLastSeen(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, loading]);

  // Close when clicking outside the panel.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const notifications = buildNotifications(items, logs, notificationSettings, {
    isAdmin,
    lastSeenLogNumber: lastSeen ?? newestLog,
  });

  function toggle() {
    const next = !open;
    setOpen(next);
    // Opening the panel marks new pull-outs as seen (they stay listed until
    // the panel is closed, then disappear).
    if (!next && staffId) {
      writeSeen(staffId, newestLog);
      setLastSeen(newestLog);
    }
  }

  function go(page: string) {
    setOpen(false);
    if (staffId) {
      writeSeen(staffId, newestLog);
      setLastSeen(newestLog);
    }
    setPage(page);
  }

  const count = notifications.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
        aria-label={`Notifications (${count})`}
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-primary text-white text-[10px] font-semibold flex items-center justify-center">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              Notifications
            </span>
            <span className="text-xs text-muted-foreground">{count}</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {count === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                You're all caught up.
              </div>
            ) : (
              notifications.map((n) => {
                const s = KIND_STYLE[n.kind];
                const Icon = s.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => go(n.page)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${s.bg}`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">
                        {n.title}
                      </span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {n.detail}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
          {isAdmin && (
            <button
              onClick={() => go("Settings")}
              className="w-full px-4 py-2.5 text-xs text-muted-foreground border-t border-border hover:bg-muted/50 transition-colors"
            >
              Change which alerts show in Settings &gt; Notifications
            </button>
          )}
        </div>
      )}
    </div>
  );
}
