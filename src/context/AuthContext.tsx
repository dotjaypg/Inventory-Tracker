import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { Staff } from "../types";

interface AuthContextValue {
  staffList: Staff[];
  currentStaff: Staff | null;
  loading: boolean;
  refreshStaffList: () => Promise<void>;
  login: (
    staffId: string,
    pin: string,
  ) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
  addStaff: (
    name: string,
    pin: string,
    role: "admin" | "staff",
  ) => Promise<{ ok: boolean; message?: string }>;
  resetPin: (
    staffId: string,
    newPin: string,
  ) => Promise<{ ok: boolean; message?: string }>;
  deleteStaff: (staffId: string) => Promise<{ ok: boolean; message?: string }>;
  updateStaffRole: (
    staffId: string,
    role: "admin" | "staff",
  ) => Promise<{ ok: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshStaffList() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("staff_public")
      .select("*")
      .order("name");
    if (!error && data) setStaffList(data as Staff[]);
  }

  useEffect(() => {
    async function init() {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }
      await refreshStaffList();
      // Intentionally not restoring any previous session here — every page
      // load/visit starts at the Login screen, no "stay logged in" behavior.
      setLoading(false);
    }
    init();
  }, []);

  async function login(
    staffId: string,
    pin: string,
  ): Promise<{ ok: boolean; message?: string }> {
    if (!supabase)
      return { ok: false, message: "Supabase isn't configured yet." };
    const { data, error } = await supabase.rpc("verify_pin", {
      staff_id: staffId,
      pin_attempt: pin,
    });
    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: "Incorrect PIN. Try again." };

    const matched = staffList.find((s) => s.id === staffId);
    if (!matched) return { ok: false, message: "Staff record not found." };

    setCurrentStaff(matched);
    return { ok: true };
  }

  function logout() {
    setCurrentStaff(null);
  }

  async function addStaff(
    name: string,
    pin: string,
    role: "admin" | "staff",
  ): Promise<{ ok: boolean; message?: string }> {
    if (!supabase)
      return { ok: false, message: "Supabase isn't configured yet." };
    if (!/^\d{4,6}$/.test(pin))
      return { ok: false, message: "PIN must be 4–6 digits." };
    const { error } = await supabase.rpc("create_staff", {
      p_name: name,
      p_pin: pin,
      p_role: role,
    });
    if (error) return { ok: false, message: error.message };
    await refreshStaffList();
    return { ok: true };
  }

  async function resetPin(
    staffId: string,
    newPin: string,
  ): Promise<{ ok: boolean; message?: string }> {
    if (!supabase)
      return { ok: false, message: "Supabase isn't configured yet." };
    if (!/^\d{4,6}$/.test(newPin))
      return { ok: false, message: "PIN must be 4–6 digits." };
    const { error } = await supabase.rpc("set_pin", {
      p_staff_id: staffId,
      p_new_pin: newPin,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  async function deleteStaff(
    staffId: string,
  ): Promise<{ ok: boolean; message?: string }> {
    if (!supabase)
      return { ok: false, message: "Supabase isn't configured yet." };
    const { error } = await supabase.rpc("delete_staff", {
      p_staff_id: staffId,
    });
    if (error) return { ok: false, message: error.message };
    if (currentStaff?.id === staffId) logout();
    await refreshStaffList();
    return { ok: true };
  }

  async function updateStaffRole(
    staffId: string,
    role: "admin" | "staff",
  ): Promise<{ ok: boolean; message?: string }> {
    if (!supabase)
      return { ok: false, message: "Supabase isn't configured yet." };
    const { error } = await supabase.rpc("set_staff_role", {
      p_staff_id: staffId,
      p_role: role,
    });
    if (error) return { ok: false, message: error.message };
    // Keep the current session's role in sync if the admin changed their own role.
    if (currentStaff?.id === staffId) {
      setCurrentStaff({ ...currentStaff, role });
    }
    await refreshStaffList();
    return { ok: true };
  }

  return (
    <AuthContext.Provider
      value={{
        staffList,
        currentStaff,
        loading,
        refreshStaffList,
        login,
        logout,
        addStaff,
        resetPin,
        deleteStaff,
        updateStaffRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
