import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CategoryKey, CATEGORIES } from "../types";

export type CategoryFilterValue = "all" | CategoryKey;

const MATERIALS_KEYS: CategoryKey[] = ["marketing", "production"];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-card border-border text-muted-foreground hover:bg-muted/50"
      }`}
    >
      {children}
    </button>
  );
}

export default function CategoryChips({
  value,
  onChange,
}: {
  value: CategoryFilterValue;
  onChange: (v: CategoryFilterValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const materialsActive = MATERIALS_KEYS.includes(value as CategoryKey);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Chip active={value === "all"} onClick={() => onChange("all")}>
        All
      </Chip>

      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            materialsActive
              ? "bg-foreground text-background border-foreground"
              : "bg-card border-border text-muted-foreground hover:bg-muted/50"
          }`}
        >
          Materials
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1.5 bg-card border border-border rounded-lg shadow-lg z-30 min-w-[190px] overflow-hidden">
            {MATERIALS_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
                className={`block w-full text-left px-3.5 py-2.5 text-sm transition-colors ${
                  value === key ? "bg-accent text-accent-foreground font-medium" : "text-foreground hover:bg-muted/60"
                }`}
              >
                {CATEGORIES[key].label}
              </button>
            ))}
          </div>
        )}
      </div>

      <Chip active={value === "merch"} onClick={() => onChange("merch")}>
        {CATEGORIES.merch.label}
      </Chip>
      <Chip active={value === "equipment"} onClick={() => onChange("equipment")}>
        {CATEGORIES.equipment.label}
      </Chip>
    </div>
  );
}
