import { useEffect, useState } from "react";
import { Package, ChevronLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";

export default function Login() {
  const { staffList, staffListError, login, refreshStaffList } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Support a QR-code deep link like  yourapp.com/?staff=<id>  that
  // pre-selects a person so they just scan and type their PIN.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQr = params.get("staff");
    if (fromQr) setSelectedId(fromQr);
  }, []);

  const selected = staffList.find((s) => s.id === selectedId) || null;

  async function handleSubmit() {
    if (!selected || pin.length < 4) return;
    setSubmitting(true);
    setError("");
    const result = await login(selected.id, pin);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message || "Something went wrong.");
      setPin("");
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-3">
            <Package className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-lg font-bold text-foreground">InvenTrack</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
          {!selected ? (
            <>
              <h2 className="text-sm font-semibold text-foreground mb-4">Who are you?</h2>
              {staffListError ? (
                <div className="space-y-3">
                  <p className="text-sm text-destructive">{staffListError}</p>
                  <p className="text-xs text-muted-foreground">
                    Check the Supabase URL and key, and confirm the
                    {" "}staff_public view exists. For a new project, run
                    {" "}supabase/schema.sql. Do not run it on an existing
                    database; it deletes existing data.
                  </p>
                  <button
                    onClick={async () => {
                      setRetrying(true);
                      await refreshStaffList();
                      setRetrying(false);
                    }}
                    disabled={retrying}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {retrying ? "Checking…" : "Try again"}
                  </button>
                </div>
              ) : staffList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No staff accounts found. If this is a new project, run
                  {" "}supabase/schema.sql in Supabase to set it up and seed
                  the default Admin account. Do not run it on an existing
                  database; it deletes existing data.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {staffList.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedId(s.id);
                        setPin("");
                        setError("");
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left"
                    >
                      <Avatar name={s.name} />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">{s.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{s.role}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setSelectedId(null);
                  setPin("");
                  setError("");
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
              <div className="flex flex-col items-center mb-5">
                <Avatar name={selected.name} size="lg" />
                <h2 className="text-sm font-semibold text-foreground mt-2">{selected.name}</h2>
                <p className="text-xs text-muted-foreground capitalize">{selected.role}</p>
              </div>
              <label className="block text-sm font-medium text-foreground mb-1.5 text-center">Enter your PIN</label>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="••••"
                className="w-full text-center text-2xl tracking-[0.4em] px-3 py-3 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              {error && <p className="text-xs text-destructive text-center mt-2">{error}</p>}
              <button
                onClick={handleSubmit}
                disabled={pin.length < 4 || submitting}
                className={`w-full mt-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pin.length < 4 || submitting ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-white hover:opacity-90"
                }`}
              >
                {submitting ? "Checking…" : "Sign in"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
