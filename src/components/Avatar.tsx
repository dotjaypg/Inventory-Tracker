type Size = "sm" | "md" | "lg";

const COLORS = [
  "bg-red-100 text-red-700",
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-yellow-100 text-yellow-700",
];

export default function Avatar({ name, size = "sm" }: { name: string; size?: Size }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const color = COLORS[name.charCodeAt(0) % COLORS.length];
  const sz = size === "sm" ? "w-8 h-8 text-xs" : size === "md" ? "w-10 h-10 text-sm" : "w-12 h-12 text-base";
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}
