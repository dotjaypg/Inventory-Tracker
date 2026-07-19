import { useRef, useState } from "react";
import { ImageUp, X } from "lucide-react";

export default function ImageUpload({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function loadFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target?.result as string);
    reader.readAsDataURL(file);
    // NOTE: this stores the photo as a base64 data URL in local state, which
    // is fine for a prototype. Once Supabase is connected, swap this for an
    // upload to Supabase Storage and store the returned public URL instead.
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) loadFile(file);
        }}
        className={`relative h-56 rounded-xl border-2 border-dashed cursor-pointer flex items-center justify-center overflow-hidden transition-colors ${
          dragOver
            ? "border-primary bg-accent"
            : value
              ? "border-border"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
        }`}
      >
        {value ? (
          <img
            src={value}
            alt="Item preview"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="text-center px-6 pointer-events-none">
            <ImageUp className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm font-medium text-foreground">
              Click to upload or drag &amp; drop
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              PNG, JPG, WEBP — max 5MB
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) loadFile(file);
          }}
        />
      </div>
      {value && (
        <button
          onClick={() => {
            onChange(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="w-full mt-2 flex items-center justify-center gap-2 bg-neutral-700 dark:bg-neutral-700 text-white border border-transparent py-2 rounded-lg text-sm font-medium hover:bg-neutral-600 dark:hover:bg-neutral-600 transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Remove photo
        </button>
      )}
    </div>
  );
}
