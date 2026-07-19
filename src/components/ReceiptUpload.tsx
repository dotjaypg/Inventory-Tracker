import { useRef } from "react";
import { Paperclip, X, FileText } from "lucide-react";

export default function ReceiptUpload({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function loadFile(file: File) {
    const isAllowed =
      file.type.startsWith("image/") || file.type === "application/pdf";
    if (!isAllowed) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  const isPdf = value?.startsWith("data:application/pdf");

  return (
    <div>
      {value ? (
        <div className="flex items-center gap-3 border border-border rounded-lg p-3">
          {isPdf ? (
            <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
          ) : (
            <img
              src={value}
              alt="Receipt preview"
              className="w-12 h-12 rounded-md object-cover border border-border flex-shrink-0"
            />
          )}
          <span className="text-sm text-foreground flex-1 min-w-0 truncate">
            {isPdf ? "Receipt (PDF) attached" : "Receipt image attached"}
          </span>
          <button
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg py-3 text-sm text-muted-foreground hover:border-primary/50 hover:bg-muted/30 transition-colors"
        >
          <Paperclip className="w-4 h-4" /> Attach receipt (image or PDF)
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) loadFile(file);
        }}
      />
    </div>
  );
}
