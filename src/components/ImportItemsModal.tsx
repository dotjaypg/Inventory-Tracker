import { useRef, useState } from "react";
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useInventory } from "../context/InventoryContext";
import { CATEGORIES } from "../types";
import {
  csvTemplate,
  downloadCSV,
  datedFilename,
  parseInventoryCSV,
  ParseResult,
  RowProblem,
  CSV_HEADERS,
} from "../lib/csv";

type Step = "start" | "preview" | "importing" | "done";

export default function ImportItemsModal({ onClose }: { onClose: () => void }) {
  const { items, addItem } = useInventory();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("start");
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [ready, setReady] = useState<ParseResult["rows"]>([]);
  const [skipped, setSkipped] = useState<RowProblem[]>([]);
  const [problems, setProblems] = useState<RowProblem[]>([]);
  const [progress, setProgress] = useState(0);
  const [added, setAdded] = useState(0);
  const [failed, setFailed] = useState<RowProblem[]>([]);
  const [dragging, setDragging] = useState(false);

  async function readFile(file: File) {
    setFileError("");
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError(
        'Please choose a .csv file. In Excel use "File > Save As > CSV".',
      );
      return;
    }
    const result = parseInventoryCSV(await file.text());
    if (result.fileError) {
      setFileError(result.fileError);
      return;
    }
    // Skip items that already exist (by name), and repeats inside the file,
    // so importing the same file twice never creates duplicates.
    const existing = new Set(items.map((i) => i.name.trim().toLowerCase()));
    const seen = new Set<string>();
    const ok: ParseResult["rows"] = [];
    const dup: RowProblem[] = [];
    for (const r of result.rows) {
      const key = r.name.toLowerCase();
      if (existing.has(key)) {
        dup.push({ row: r.row, name: r.name, message: "Already in inventory" });
      } else if (seen.has(key)) {
        dup.push({ row: r.row, name: r.name, message: "Listed twice in the file" });
      } else {
        seen.add(key);
        ok.push(r);
      }
    }
    setFileName(file.name);
    setReady(ok);
    setSkipped(dup);
    setProblems(result.problems);
    setStep("preview");
  }

  async function runImport() {
    setStep("importing");
    setProgress(0);
    let count = 0;
    const errs: RowProblem[] = [];
    for (let i = 0; i < ready.length; i++) {
      const { row, ...data } = ready[i];
      const res = await addItem({
        ...data,
        image: null,
        clientRequestId: crypto.randomUUID(),
      });
      if (res.ok) count++;
      else errs.push({ row, name: data.name, message: res.message || "Could not add." });
      setProgress(i + 1);
    }
    setAdded(count);
    setFailed(errs);
    setStep("done");
  }

  function reset() {
    setStep("start");
    setFileName("");
    setFileError("");
  }

  const busy = step === "importing";

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-lg font-semibold text-foreground">Import items</h3>
          <button
            onClick={onClose}
            disabled={busy}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-6 overflow-y-auto space-y-4">
          {step === "start" && (
            <>
              <Step n={1} title="Download the template">
                <p className="text-xs text-muted-foreground mb-2">
                  A spreadsheet with the right columns and two example rows.
                </p>
                <button
                  onClick={() =>
                    downloadCSV(datedFilename("inventory-template"), csvTemplate())
                  }
                  className="flex items-center gap-2 bg-neutral-700 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-neutral-600 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download template
                </button>
              </Step>

              <Step n={2} title="Fill it in">
                <p className="text-xs text-muted-foreground">
                  Open it in Excel or Google Sheets, add one item per row, then
                  save it as <span className="font-medium">CSV</span>. Required:
                  Item name, Category, Counting unit, Stock. The example rows
                  are skipped automatically.
                </p>
                <details className="mt-2 text-xs text-muted-foreground">
                  <summary className="cursor-pointer text-foreground">
                    What goes in each column?
                  </summary>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>
                      <b>Category:</b>{" "}
                      {Object.values(CATEGORIES)
                        .map((c) => c.label)
                        .join(", ")}
                    </li>
                    <li>
                      <b>Counting unit:</b> the single piece you count (sheet,
                      pcs, roll), not the pack
                    </li>
                    <li>
                      <b>Stock:</b> how many you have now, counted in that unit
                    </li>
                    <li>
                      <b>Low stock alert at:</b> warn when stock drops to this
                    </li>
                    <li>
                      <b>Returnable:</b> yes for equipment that is borrowed, no
                      for materials that get used up
                    </li>
                    <li>
                      <b>Pack price / Units per pack / Pull out in groups of /
                      Locker / Supplier / Notes:</b> optional
                    </li>
                  </ul>
                  <p className="mt-2">
                    Columns: {CSV_HEADERS.join(", ")}
                  </p>
                </details>
              </Step>

              <Step n={3} title="Upload the file">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) readFile(f);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) readFile(f);
                  }}
                  className={`w-full border-2 border-dashed rounded-xl py-6 flex flex-col items-center gap-2 transition-colors ${
                    dragging ? "border-primary bg-accent" : "border-border hover:bg-muted/30"
                  }`}
                >
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    Click to choose a CSV file
                  </span>
                  <span className="text-xs text-muted-foreground">or drag and drop it here</span>
                </button>
                {fileError && (
                  <p className="text-xs text-destructive mt-2">{fileError}</p>
                )}
              </Step>
            </>
          )}

          {step === "preview" && (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="w-4 h-4" /> {fileName}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat value={ready.length} label="Will be added" tone="green" />
                <Stat value={skipped.length} label="Skipped (duplicate)" tone="gray" />
                <Stat value={problems.length} label="Need fixing" tone="red" />
              </div>

              {ready.length > 0 && (
                <div className="border border-border rounded-lg divide-y divide-border max-h-56 overflow-y-auto">
                  {ready.map((r) => (
                    <div key={r.row} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">{r.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {CATEGORIES[r.category].label}
                          {r.returnable ? " · returnable" : ""}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {r.stock} {r.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <ProblemList title="Skipped because they already exist" items={skipped} tone="gray" />
              <ProblemList
                title="Not added. Fix these rows in your file and import again"
                items={problems}
                tone="red"
              />

              <div className="flex gap-3 pt-1">
                <button
                  onClick={reset}
                  className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50"
                >
                  Choose another file
                </button>
                <button
                  onClick={runImport}
                  disabled={ready.length === 0}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add {ready.length} item{ready.length === 1 ? "" : "s"}
                </button>
              </div>
            </>
          )}

          {step === "importing" && (
            <div className="py-6 text-center space-y-3">
              <p className="text-sm text-foreground">
                Adding {progress} of {ready.length}…
              </p>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${ready.length ? (progress / ready.length) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Please keep this window open.</p>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  {added} item{added === 1 ? "" : "s"} added to inventory.
                </span>
              </div>
              <ProblemList title="Could not be added" items={failed} tone="red" />
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-6 h-6 rounded-full bg-accent text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0">
        {n}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground mb-1">{title}</div>
        {children}
      </div>
    </div>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone: "green" | "gray" | "red" }) {
  const color =
    tone === "green"
      ? "text-green-600 dark:text-green-400"
      : tone === "red"
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";
  return (
    <div className="bg-muted/50 rounded-lg py-2">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ProblemList({ title, items, tone }: { title: string; items: RowProblem[]; tone: "gray" | "red" }) {
  if (items.length === 0) return null;
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-xs ${
        tone === "red"
          ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300"
          : "bg-muted/50 border-border text-muted-foreground"
      }`}
    >
      <div className="flex items-center gap-1.5 font-medium mb-1">
        {tone === "red" && <AlertTriangle className="w-3.5 h-3.5" />} {title}
      </div>
      <ul className="space-y-0.5 max-h-32 overflow-y-auto">
        {items.map((p, i) => (
          <li key={i}>
            Row {p.row}, {p.name}: {p.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
