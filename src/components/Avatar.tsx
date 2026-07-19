type Size = "sm" | "md" | "lg";

const COLORS = [
  "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
];

export default function Avatar({
  name,
  size = "sm",
}: {
  name: string;
  size?: Size;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const color = COLORS[name.charCodeAt(0) % COLORS.length];
  const sz =
    size === "sm"
      ? "w-8 h-8 text-xs"
      : size === "md"
        ? "w-10 h-10 text-sm"
        : "w-12 h-12 text-base";
  return (
    <div
      className={`${sz} ${color} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}
    >
      {initials}
    </div>
  );
}
