import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  InventoryItem,
  Employee,
  LogEntry,
  RestockEntry,
  DamageRecord,
  CategoryKey,
  unitCost,
} from "../types";
import {
  seedItems,
  seedEmployees,
  seedLogs,
  seedRestocks,
} from "../data/mockData";
import { useAuth } from "./AuthContext";

// Turns raw Postgres/Supabase error objects into plain-language messages.
// Falls back to a generic message for anything we don't specifically recognize,
// so the user never sees raw SQL/constraint text.
function friendlyError(
  error: { code?: string; message?: string } | null,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!error) return fallback;
  switch (error.code) {
    case "23503": // foreign_key_violation
      return "This item no longer exists in your inventory — it may have just been deleted. Please refresh the page and try again.";
    case "23505": // unique_violation
      return "That already exists — please use a different value.";
    case "23514": // check_violation
      return "One of the values entered isn't valid for this field.";
    case "42501": // insufficient_privilege (RLS/permissions)
      return "You don't have permission to do that. Make sure your database is set up correctly.";
    default:
      return fallback;
  }
}

export interface NewItemInput {
  name: string;
  category: CategoryKey;
  unit: string;
  stock: number;
  minStock: number;
  maxStock: number;
  location: string;
  supplier: string;
  description: string;
  image: string | null;
  locker?: string;
  condition?: string;
  packPrice?: number;
  packSize?: number;
  qtyStep?: number;
  returnable?: boolean;
  clientRequestId?: string; // idempotency key — set by callers that need duplicate-submission protection (e.g. Add Item)
}

interface BorrowInput {
  itemId: number;
  employee: string;
  dept: string;
  qty: number;
  purpose: string;
  conditionOut?: string | null; // used for returnable pull-outs instead of purpose
  clientRequestId: string; // idempotency key — generated once per form-open, reused across repeated clicks of the same submit
}

interface RestockInput {
  itemId: number;
  qty: number;
  name: string;
}

export interface DamageRecordInput {
  logId: string | null;
  itemId: number;
  title: string;
  description: string;
  cost: number;
  date: string;
  receiptUrl: string;
}

interface InventoryContextValue {
  items: InventoryItem[];
  employees: Employee[];
  logs: LogEntry[];
  restocks: RestockEntry[];
  damageRecords: DamageRecord[];
  loading: boolean;
  usingMockData: boolean;
  dbSizeMb: number | null;
  lastClearedAt: string | null;
  refresh: () => Promise<void>;
  addItem: (input: NewItemInput) => Promise<{ ok: boolean; message?: string }>;
  updateItem: (
    id: number,
    input: NewItemInput,
  ) => Promise<{ ok: boolean; message?: string }>;
  deleteItem: (id: number) => Promise<{ ok: boolean; message?: string }>;
  borrowItem: (
    input: BorrowInput,
  ) => Promise<{ ok: boolean; message?: string }>;
  turnBackItem: (
    logId: string,
    conditionIn?: string | null,
  ) => Promise<{ ok: boolean; message?: string }>;
  restockItem: (
    input: RestockInput,
  ) => Promise<{ ok: boolean; message?: string }>;
  addDamageRecord: (
    input: DamageRecordInput,
  ) => Promise<{ ok: boolean; message?: string }>;
  clearHistory: (
    clearLogs: boolean,
    clearRestocks: boolean,
  ) => Promise<{ ok: boolean; message?: string }>;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

function rowToItem(row: any): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    stock: row.stock,
    unit: row.unit,
    minStock: row.min_stock,
    maxStock: row.max_stock,
    location: row.location || "",
    locker: row.locker || "",
    condition: row.condition || "",
    supplier: row.supplier || "",
    description: row.description || "",
    image: row.image_url || null,
    lastUpdated: row.last_updated,
    packPrice: row.pack_price || 0,
    packSize: row.pack_size || 1,
    qtyStep: row.qty_step || 1,
    returnable: row.returnable ?? row.category === "equipment",
  };
}

function rowToLog(row: any): LogEntry {
  return {
    id: row.display_id,
    itemId: row.item_id,
    item: row.item,
    category: row.category,
    qty: row.qty,
    unit: row.unit,
    employee: row.employee,
    dept: row.dept || "",
    purpose: row.purpose || "",
    borrowDate: row.borrow_date,
    status: row.status,
    returnedAt: row.returned_at,
    confirmedBy: row.confirmed_by || null,
    approvedBy: row.approved_by,
    needsReturn: row.needs_return ?? row.category === "equipment",
    conditionOut: row.condition_out || null,
    conditionIn: row.condition_in || null,
    cost: row.cost || 0,
  };
}

function rowToRestock(row: any): RestockEntry {
  return {
    id: row.id,
    itemId: row.item_id,
    item: row.item,
    qty: row.qty,
    name: row.name,
    date: row.date,
  };
}

function rowToDamageRecord(row: any): DamageRecord {
  return {
    id: row.id,
    logId: row.log_id,
    itemId: row.item_id,
    item: row.item,
    title: row.title,
    description: row.description || "",
    cost: row.cost || 0,
    date: row.date,
    receiptUrl: row.receipt_url,
    createdBy: row.created_by || null,
  };
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { currentStaff } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [employees] = useState<Employee[]>(seedEmployees);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [restocks, setRestocks] = useState<RestockEntry[]>([]);
  const [damageRecords, setDamageRecords] = useState<DamageRecord[]>([]);
  const [dbSizeMb, setDbSizeMb] = useState<number | null>(null);
  const [lastClearedAt, setLastClearedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const usingMockData = !isSupabaseConfigured;

  // Tracks pull-out idempotency keys that are currently being submitted or
  // have already been submitted this session. Checked synchronously — before
  // any network round trip — so even a double-click that fires two calls to
  // borrowItem() back-to-back (before React has re-rendered the disabled
  // button) can't both proceed.
  const seenRequestIds = useRef<Set<string>>(new Set());

  async function refresh() {
    if (!supabase) {
      setItems(seedItems);
      setLogs(seedLogs);
      setRestocks(seedRestocks);
      setDamageRecords([]);
      setDbSizeMb(null);
      setLastClearedAt(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [itemsRes, logsRes, restocksRes, damageRes, sizeRes, settingsRes] =
      await Promise.all([
        supabase.from("items").select("*").order("name"),
        supabase
          .from("logs")
          .select("*")
          .order("borrow_date", { ascending: false }),
        supabase
          .from("restocks")
          .select("*")
          .order("date", { ascending: false }),
        supabase
          .from("damage_records")
          .select("*")
          .order("date", { ascending: false }),
        supabase.rpc("get_db_size_mb"),
        supabase
          .from("app_settings")
          .select("*")
          .eq("key", "last_cleared_at")
          .maybeSingle(),
      ]);
    if (itemsRes.data) setItems(itemsRes.data.map(rowToItem));
    if (logsRes.data) setLogs(logsRes.data.map(rowToLog));
    if (restocksRes.data) setRestocks(restocksRes.data.map(rowToRestock));
    if (damageRes.data) setDamageRecords(damageRes.data.map(rowToDamageRecord));
    if (typeof sizeRes.data === "number") setDbSizeMb(sizeRes.data);
    setLastClearedAt(settingsRes.data?.value ?? null);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function addItem(
    input: NewItemInput,
  ): Promise<{ ok: boolean; message?: string }> {
    // Same idempotency guard used for pull-outs: if this exact submission has
    // already been seen (in flight or completed), don't create a second item.
    if (input.clientRequestId) {
      if (seenRequestIds.current.has(input.clientRequestId)) {
        return { ok: true };
      }
      seenRequestIds.current.add(input.clientRequestId);
    }

    if (!supabase) {
      setItems((prev) => {
        const nextId = prev.length ? Math.max(...prev.map((i) => i.id)) + 1 : 1;
        return [
          ...prev,
          {
            id: nextId,
            name: input.name,
            category: input.category,
            unit: input.unit,
            stock: input.stock,
            minStock: input.minStock,
            maxStock: input.maxStock,
            location: input.location || "Unassigned",
            locker: input.locker || "",
            condition: input.condition || "",
            supplier: input.supplier || "—",
            description: input.description || "",
            image: input.image,
            lastUpdated: new Date().toISOString().slice(0, 10),
            packPrice: input.packPrice || 0,
            packSize: input.packSize || 1,
            qtyStep: input.qtyStep || 1,
            returnable: input.returnable ?? input.category === "equipment",
          },
        ];
      });
      return { ok: true };
    }

    const { error } = await supabase.from("items").insert({
      name: input.name,
      category: input.category,
      stock: input.stock,
      unit: input.unit,
      min_stock: input.minStock,
      max_stock: input.maxStock,
      location: input.location,
      locker: input.locker || "",
      condition: input.condition || "",
      supplier: input.supplier,
      description: input.description,
      image_url: input.image,
      pack_price: input.packPrice || 0,
      pack_size: input.packSize || 1,
      qty_step: input.qtyStep || 1,
      returnable: input.returnable ?? input.category === "equipment",
      client_request_id: input.clientRequestId || null,
    });
    if (error) {
      const isDuplicateSubmission =
        error.code === "23505" &&
        (error as any).message?.includes("client_request_id");
      if (!isDuplicateSubmission) {
        return { ok: false, message: friendlyError(error) };
      }
    }
    await refresh();
    return { ok: true };
  }

  async function updateItem(
    id: number,
    input: NewItemInput,
  ): Promise<{ ok: boolean; message?: string }> {
    if (!supabase) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                name: input.name,
                category: input.category,
                unit: input.unit,
                stock: input.stock,
                minStock: input.minStock,
                maxStock: input.maxStock,
                location: input.location || i.location,
                locker: input.locker ?? i.locker,
                condition: input.condition ?? i.condition,
                supplier: input.supplier,
                description: input.description,
                image: input.image,
                packPrice: input.packPrice ?? i.packPrice,
                packSize: input.packSize ?? i.packSize,
                qtyStep: input.qtyStep ?? i.qtyStep,
                returnable: input.returnable ?? i.returnable,
                lastUpdated: new Date().toISOString().slice(0, 10),
              }
            : i,
        ),
      );
      return { ok: true };
    }

    const { error } = await supabase
      .from("items")
      .update({
        name: input.name,
        category: input.category,
        stock: input.stock,
        unit: input.unit,
        min_stock: input.minStock,
        max_stock: input.maxStock,
        location: input.location,
        locker: input.locker || "",
        condition: input.condition || "",
        supplier: input.supplier,
        description: input.description,
        image_url: input.image,
        pack_price: input.packPrice || 0,
        pack_size: input.packSize || 1,
        qty_step: input.qtyStep || 1,
        returnable: input.returnable ?? false,
        last_updated: new Date().toISOString().slice(0, 10),
      })
      .eq("id", id);
    if (error) return { ok: false, message: friendlyError(error) };
    await refresh();
    return { ok: true };
  }

  async function deleteItem(
    id: number,
  ): Promise<{ ok: boolean; message?: string }> {
    if (!supabase) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      return { ok: true };
    }
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) return { ok: false, message: friendlyError(error) };
    await refresh();
    return { ok: true };
  }

  async function borrowItem(
    input: BorrowInput,
  ): Promise<{ ok: boolean; message?: string }> {
    // Synchronous, in-memory first line of defense: if this exact submission
    // (same idempotency key) has already been seen — whether it's still in
    // flight or already completed — don't do anything a second time.
    if (seenRequestIds.current.has(input.clientRequestId)) {
      return { ok: true };
    }
    seenRequestIds.current.add(input.clientRequestId);

    const item = items.find((i) => i.id === input.itemId);
    if (!item) return { ok: false, message: "Item not found." };
    if (input.qty > item.stock)
      return {
        ok: false,
        message: `Only ${item.stock} ${item.unit} available.`,
      };

    // Only materials (consumed, not returned) carry a real cost. Equipment
    // pull-outs are not a financial loss just from being borrowed — any actual
    // loss from equipment is captured separately via a Damage Record when it
    // comes back Damaged / Needs repair.
    const cost = item.returnable
      ? 0
      : Math.round(unitCost(item) * input.qty * 100) / 100;
    const needsReturn = item.returnable;
    const today = new Date().toISOString().slice(0, 10);

    if (!supabase) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, stock: i.stock - input.qty } : i,
        ),
      );
      setLogs((prev) => [
        {
          id: `REQ-${String(prev.length + 42).padStart(4, "0")}`,
          itemId: item.id,
          item: item.name,
          category: item.category,
          qty: input.qty,
          unit: item.unit,
          employee: input.employee,
          dept: input.dept,
          purpose: input.purpose,
          borrowDate: today,
          status: needsReturn ? "active" : "returned",
          returnedAt: needsReturn ? null : today,
          confirmedBy: currentStaff?.name ?? null,
          approvedBy: null,
          needsReturn,
          conditionOut: needsReturn ? input.conditionOut || null : null,
          conditionIn: null,
          cost,
        },
        ...prev,
      ]);
      return { ok: true };
    }

    const { error: logError } = await supabase.from("logs").insert({
      item_id: item.id,
      item: item.name,
      category: item.category,
      qty: input.qty,
      unit: item.unit,
      staff_id: currentStaff?.id ?? null,
      employee: input.employee,
      dept: input.dept,
      purpose: input.purpose,
      status: needsReturn ? "active" : "returned",
      returned_at: needsReturn ? null : new Date().toISOString(),
      confirmed_by: currentStaff?.name ?? null,
      needs_return: needsReturn,
      condition_out: needsReturn ? input.conditionOut || null : null,
      cost,
      client_request_id: input.clientRequestId,
    });
    if (logError) {
      // A unique-constraint hit on client_request_id means this exact
      // submission already went through once before (e.g. a slow network
      // caused a retry, or an earlier click's request is still landing) —
      // that's not a real error, the pull-out already exists, so treat it
      // as a successful no-op instead of showing the user an error.
      const isDuplicateSubmission =
        logError.code === "23505" &&
        (logError as any).message?.includes("client_request_id");
      if (!isDuplicateSubmission) {
        return { ok: false, message: friendlyError(logError) };
      }
      await refresh();
      return { ok: true };
    }

    const { error: itemError } = await supabase
      .from("items")
      .update({
        stock: item.stock - input.qty,
        last_updated: new Date().toISOString().slice(0, 10),
      })
      .eq("id", item.id);
    if (itemError) return { ok: false, message: friendlyError(itemError) };

    await refresh();
    return { ok: true };
  }

  async function turnBackItem(
    logId: string,
    conditionIn?: string | null,
  ): Promise<{ ok: boolean; message?: string }> {
    const log = logs.find((l) => l.id === logId);
    if (!log || log.status === "returned")
      return { ok: false, message: "Already returned." };

    if (!supabase) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === log.itemId ? { ...i, stock: i.stock + log.qty } : i,
        ),
      );
      setLogs((prev) =>
        prev.map((l) =>
          l.id === logId
            ? {
                ...l,
                status: "returned",
                returnedAt: new Date().toISOString().slice(0, 10),
                approvedBy: currentStaff?.name ?? l.approvedBy,
                conditionIn: conditionIn ?? l.conditionIn,
              }
            : l,
        ),
      );
      return { ok: true };
    }

    const { error: logError } = await supabase
      .from("logs")
      .update({
        status: "returned",
        returned_at: new Date().toISOString(),
        approved_by: currentStaff?.name ?? null,
        condition_in: conditionIn ?? null,
      })
      .eq("display_id", logId);
    if (logError) return { ok: false, message: friendlyError(logError) };

    const item = items.find((i) => i.id === log.itemId);
    if (item) {
      const { error: itemError } = await supabase
        .from("items")
        .update({
          stock: item.stock + log.qty,
          last_updated: new Date().toISOString().slice(0, 10),
        })
        .eq("id", item.id);
      if (itemError) return { ok: false, message: friendlyError(itemError) };
    }

    await refresh();
    return { ok: true };
  }

  async function restockItem(
    input: RestockInput,
  ): Promise<{ ok: boolean; message?: string }> {
    const item = items.find((i) => i.id === input.itemId);
    if (!item) return { ok: false, message: "Item not found." };
    if (input.qty <= 0)
      return { ok: false, message: "Quantity must be greater than 0." };

    if (!supabase) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, stock: i.stock + input.qty } : i,
        ),
      );
      setRestocks((prev) => [
        {
          id: prev.length ? Math.max(...prev.map((r) => r.id)) + 1 : 1,
          itemId: item.id,
          item: item.name,
          qty: input.qty,
          name: input.name,
          date: new Date().toISOString().slice(0, 10),
        },
        ...prev,
      ]);
      return { ok: true };
    }

    const { error: restockError } = await supabase.from("restocks").insert({
      item_id: item.id,
      item: item.name,
      qty: input.qty,
      name: input.name,
    });
    if (restockError)
      return { ok: false, message: friendlyError(restockError) };

    const { error: itemError } = await supabase
      .from("items")
      .update({
        stock: item.stock + input.qty,
        last_updated: new Date().toISOString().slice(0, 10),
      })
      .eq("id", item.id);
    if (itemError) return { ok: false, message: friendlyError(itemError) };

    await refresh();
    return { ok: true };
  }

  async function addDamageRecord(
    input: DamageRecordInput,
  ): Promise<{ ok: boolean; message?: string }> {
    if (!input.title.trim())
      return { ok: false, message: "Please enter a title." };
    if (!input.receiptUrl)
      return { ok: false, message: "A receipt attachment is required." };
    if (input.cost <= 0)
      return {
        ok: false,
        message: "Repair/damage cost must be greater than 0.",
      };

    const item = items.find((i) => i.id === input.itemId);

    if (!supabase) {
      setDamageRecords((prev) => [
        {
          id: prev.length ? Math.max(...prev.map((d) => d.id)) + 1 : 1,
          logId: input.logId,
          itemId: input.itemId,
          item: item?.name || "",
          title: input.title.trim(),
          description: input.description.trim(),
          cost: input.cost,
          date: input.date,
          receiptUrl: input.receiptUrl,
          createdBy: currentStaff?.name ?? null,
        },
        ...prev,
      ]);
      return { ok: true };
    }

    const { error } = await supabase.from("damage_records").insert({
      log_id: input.logId,
      item_id: input.itemId,
      item: item?.name || "",
      title: input.title.trim(),
      description: input.description.trim(),
      cost: input.cost,
      date: input.date,
      receipt_url: input.receiptUrl,
      created_by: currentStaff?.name ?? null,
    });
    if (error) return { ok: false, message: friendlyError(error) };
    await refresh();
    return { ok: true };
  }

  async function clearHistory(
    clearLogs: boolean,
    clearRestocks: boolean,
  ): Promise<{ ok: boolean; message?: string }> {
    if (!clearLogs && !clearRestocks) {
      return { ok: false, message: "Select at least one thing to clear." };
    }

    if (!supabase) {
      if (clearLogs) setLogs([]);
      if (clearRestocks) setRestocks([]);
      setLastClearedAt(new Date().toISOString());
      return { ok: true };
    }

    const { error } = await supabase.rpc("clear_history", {
      p_clear_logs: clearLogs,
      p_clear_restocks: clearRestocks,
    });
    if (error) {
      console.error("clear_history failed:", error);
      return {
        ok: false,
        message: friendlyError(
          error,
          `Could not clear history: ${error.message || "unknown error"}`,
        ),
      };
    }
    await refresh();
    return { ok: true };
  }

  return (
    <InventoryContext.Provider
      value={{
        items,
        employees,
        logs,
        restocks,
        damageRecords,
        loading,
        usingMockData,
        dbSizeMb,
        lastClearedAt,
        refresh,
        addItem,
        updateItem,
        deleteItem,
        borrowItem,
        turnBackItem,
        restockItem,
        addDamageRecord,
        clearHistory,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx)
    throw new Error("useInventory must be used within an InventoryProvider");
  return ctx;
}
